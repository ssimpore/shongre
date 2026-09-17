-- Search suggestions and "did you mean" need a vocabulary that answers prefix
-- and trigram lookups in indexed time. The catalogue columns cannot serve that
-- directly: an ILIKE or `%` over `listings.title` on every keystroke is a
-- sequential scan, and a full title is a poor suggestion. `pg_trgm` has been
-- installed since 00001 and was never used.
--
-- The vocabulary is a market-scoped projection of the words in discoverable
-- listings — public catalogue data only, refreshed by the scheduled worker.
-- It deliberately does not record what visitors type: a query log would be a
-- second store of free text that can carry personal data, and the catalogue
-- already says which words exist.

CREATE TABLE public.listing_search_terms (
  market_code VARCHAR(2) NOT NULL,
  -- Lower-cased and unaccented: the key visitors' typing is matched against.
  term TEXT NOT NULL CHECK (char_length(term) BETWEEN 2 AND 40),
  -- The catalogue's own most common spelling, shown back to the visitor.
  display_term TEXT NOT NULL CHECK (char_length(display_term) BETWEEN 2 AND 40),
  listing_count INTEGER NOT NULL CHECK (listing_count >= 0),
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (market_code, term)
);

ALTER TABLE public.listing_search_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_search_terms FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.listing_search_terms FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_search_terms TO service_role;

-- Prefix completion needs pattern operators; the primary key's default
-- collation cannot serve `LIKE 'vel%'`.
CREATE INDEX listing_search_terms_prefix_idx
  ON public.listing_search_terms (market_code, term text_pattern_ops);
CREATE INDEX listing_search_terms_trgm_idx
  ON public.listing_search_terms USING GIN (term public.gin_trgm_ops);

-- Function words carry no search intent. Kept minimal on purpose: an
-- over-eager list would drop real product words ("neuf", "occasion").
CREATE OR REPLACE FUNCTION public.listing_search_stopwords()
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT ARRAY[
    'le','la','les','de','des','du','un','une','et','ou','en','au','aux',
    'avec','pour','sur','par','dans','sans','sous','chez','vers',
    'ce','cet','cette','ces','son','sa','ses','mon','ma','mes','ton','ta','tes',
    'que','qui','quoi','dont','est','sont','the','and','for','with','of'
  ];
$$;

-- Lower-cased words with at least one letter, keyed by their unaccented
-- form. Pure numbers are dropped: "15" completes nothing useful and never
-- needs correcting.
CREATE OR REPLACE FUNCTION public.listing_search_terms_from_text(p_text TEXT)
RETURNS TABLE (term TEXT, display_term TEXT)
LANGUAGE sql
STABLE
STRICT
SET search_path = ''
AS $$
  SELECT DISTINCT public.unaccent(word) AS term, word AS display_term
    FROM regexp_split_to_table(lower(p_text), '[^[:alnum:]]+') AS word
   WHERE char_length(word) BETWEEN 2 AND 40
     AND word ~ '[[:alpha:]]'
     AND NOT (public.unaccent(word) = ANY (public.listing_search_stopwords()));
$$;

-- Rebuilds one market's vocabulary from the same discoverable set the unified
-- search reads: an active, approved publication of a published listing. A full
-- rebuild per market is a bounded scan of titles, brands and models; it runs
-- in the scheduled worker, never on a request path.
CREATE OR REPLACE FUNCTION public.refresh_listing_search_terms(p_market_code VARCHAR)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_market_code IS NULL OR p_market_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid market code' USING ERRCODE = '22023';
  END IF;

  WITH discoverable AS (
    SELECT listing.id, listing.title, listing.brand, listing.model
      FROM public.listing_market_publications publication
      JOIN public.listings listing ON listing.id = publication.listing_id
     WHERE publication.market_code = p_market_code
       AND publication.status = 'active'
       AND publication.compliance_state = 'approved'
       AND listing.status = 'published'
  ),
  words AS (
    SELECT discoverable.id, word.term, word.display_term
      FROM discoverable
      CROSS JOIN LATERAL public.listing_search_terms_from_text(
        concat_ws(' ', discoverable.title, discoverable.brand, discoverable.model)
      ) AS word
  ),
  counted AS (
    SELECT term,
           mode() WITHIN GROUP (ORDER BY display_term) AS display_term,
           COUNT(DISTINCT id)::INTEGER AS listing_count
      FROM words
     GROUP BY term
  ),
  upserted AS (
    INSERT INTO public.listing_search_terms (market_code, term, display_term, listing_count, refreshed_at)
    SELECT p_market_code, term, display_term, listing_count, NOW()
      FROM counted
    ON CONFLICT (market_code, term) DO UPDATE
      SET display_term = EXCLUDED.display_term,
          listing_count = EXCLUDED.listing_count,
          refreshed_at = EXCLUDED.refreshed_at
    RETURNING term
  ),
  removed AS (
    DELETE FROM public.listing_search_terms stale
     WHERE stale.market_code = p_market_code
       AND NOT EXISTS (SELECT 1 FROM counted WHERE counted.term = stale.term)
    RETURNING term
  )
  SELECT COUNT(*) INTO v_count FROM upserted;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_listing_search_terms(VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_listing_search_terms(VARCHAR) TO service_role;

-- Completions for the word being typed. Prefix matches come first because
-- they are what the visitor is literally typing; trigram matches follow so a
-- misspelt word still completes to something the catalogue contains.
CREATE OR REPLACE FUNCTION public.suggest_listing_search_terms(
  p_market_code VARCHAR,
  p_query TEXT,
  p_limit INTEGER DEFAULT 8
)
RETURNS TABLE (term TEXT, display_term TEXT, listing_count INTEGER, match_kind TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET pg_trgm.similarity_threshold = 0.35
AS $$
  WITH query AS (
    SELECT lower(public.unaccent(btrim(coalesce(p_query, '')))) AS text
  ),
  prefix AS (
    SELECT t.term, t.display_term, t.listing_count, 'prefix'::TEXT AS match_kind, 1::REAL AS score
      FROM public.listing_search_terms t, query
     WHERE t.market_code = p_market_code
       AND query.text <> ''
       AND t.term LIKE regexp_replace(query.text, '([%_\\])', '\\\1', 'g') || '%'
  ),
  fuzzy AS (
    SELECT t.term, t.display_term, t.listing_count, 'fuzzy'::TEXT AS match_kind,
           public.similarity(t.term, query.text) AS score
      FROM public.listing_search_terms t, query
     WHERE t.market_code = p_market_code
       AND char_length(query.text) >= 3
       AND t.term OPERATOR(public.%) query.text
       AND NOT (t.term LIKE regexp_replace(query.text, '([%_\\])', '\\\1', 'g') || '%')
  )
  SELECT term, display_term, listing_count, match_kind
    FROM (SELECT * FROM prefix UNION ALL SELECT * FROM fuzzy) AS candidates
   ORDER BY (match_kind = 'prefix') DESC, score DESC, listing_count DESC, term
   LIMIT LEAST(GREATEST(coalesce(p_limit, 8), 1), 20);
$$;

REVOKE ALL ON FUNCTION public.suggest_listing_search_terms(VARCHAR, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.suggest_listing_search_terms(VARCHAR, TEXT, INTEGER) TO service_role;

-- Replaces each word the catalogue does not contain with its nearest known
-- word, or answers NULL when nothing would change. Called only after a search
-- returned no results, so it proposes a query that can match rather than
-- second-guessing one that already did.
CREATE OR REPLACE FUNCTION public.correct_listing_search_query(
  p_market_code VARCHAR,
  p_query TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET pg_trgm.similarity_threshold = 0.4
AS $$
DECLARE
  v_token TEXT;
  v_best TEXT;
  v_words TEXT[] := '{}';
  v_changed BOOLEAN := FALSE;
BEGIN
  IF p_query IS NULL OR btrim(p_query) = '' THEN
    RETURN NULL;
  END IF;

  FOR v_token IN
    SELECT word
      FROM regexp_split_to_table(lower(public.unaccent(btrim(p_query))), '\s+') AS word
     WHERE word <> ''
  LOOP
    IF char_length(v_token) < 3
       OR v_token = ANY (public.listing_search_stopwords())
       OR EXISTS (
         SELECT 1 FROM public.listing_search_terms t
          WHERE t.market_code = p_market_code AND t.term = v_token
       )
    THEN
      v_words := v_words || v_token;
      CONTINUE;
    END IF;

    SELECT t.display_term INTO v_best
      FROM public.listing_search_terms t
     WHERE t.market_code = p_market_code
       AND t.term OPERATOR(public.%) v_token
     ORDER BY public.similarity(t.term, v_token) DESC, t.listing_count DESC, t.term
     LIMIT 1;

    IF v_best IS NULL THEN
      v_words := v_words || v_token;
    ELSE
      v_words := v_words || v_best;
      v_changed := TRUE;
    END IF;
  END LOOP;

  IF NOT v_changed THEN
    RETURN NULL;
  END IF;
  RETURN array_to_string(v_words, ' ');
END;
$$;

REVOKE ALL ON FUNCTION public.correct_listing_search_query(VARCHAR, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.correct_listing_search_query(VARCHAR, TEXT) TO service_role;
