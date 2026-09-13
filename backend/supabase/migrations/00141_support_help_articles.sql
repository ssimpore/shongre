-- Public help content is authored in PostgreSQL and projected through the API.
-- Browser and native clients never carry an embedded fallback catalogue.
CREATE TABLE public.support_help_articles (
  id TEXT PRIMARY KEY,
  locale TEXT NOT NULL CHECK (locale IN ('fr-FR', 'en-US')),
  market_code TEXT REFERENCES public.markets(code) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN ('transactions', 'listings', 'delivery', 'account', 'pro', 'safety')
  ),
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 5 AND 240),
  answer TEXT NOT NULL CHECK (char_length(answer) BETWEEN 20 AND 4000),
  link_text TEXT CHECK (link_text IS NULL OR char_length(link_text) BETWEEN 2 AND 120),
  link_href TEXT CHECK (link_href IS NULL OR link_href ~ '^/[^/]'),
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (locale, market_code, category, sort_order),
  CHECK (is_published = (published_at IS NOT NULL)),
  CHECK ((link_text IS NULL) = (link_href IS NULL))
);

CREATE INDEX support_help_articles_publication_idx
  ON public.support_help_articles (locale, market_code, category, sort_order)
  WHERE is_published;

ALTER TABLE public.support_help_articles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_help_articles FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_help_articles TO service_role;

INSERT INTO public.support_help_articles (
  id, locale, market_code, category, question, answer,
  link_text, link_href, sort_order, is_published, published_at
) VALUES
  ('faq-fr-payment', 'fr-FR', NULL, 'transactions',
   'Comment fonctionne le paiement en ligne ?',
   'Le paiement est traité par Stripe et son avancement est reflété dans la commande. Selon le mode de livraison et le statut transmis par le prestataire, le versement au vendeur peut rester en attente pendant la remise ou l''examen d''un litige. Consultez toujours le statut de la commande avant de remettre l''article.',
   'En savoir plus sur les paiements', '/securite', 10, TRUE, NOW()),
  ('faq-fr-purchase-reservation', 'fr-FR', NULL, 'transactions',
   'Quelle est la différence entre l''achat direct et la réservation ?',
   'L''Achat Direct est adapté à la livraison : vous payez la commande et la livraison, puis le vendeur expédie le colis. La Réservation sert à organiser une remise en main propre : les conditions et le montant à payer sont affichés avant toute confirmation.',
   'Voir mes transactions', '/compte/achats', 20, TRUE, NOW()),
  ('faq-fr-listing-duration', 'fr-FR', NULL, 'listings',
   'Combien de temps mon annonce reste-t-elle en ligne ?',
   'La durée de publication et les options de prolongation sont indiquées dans votre espace annonces. Consultez le statut et la date d''expiration affichés par Shongre avant toute action.',
   'Gérer mes annonces', '/compte/annonces', 30, TRUE, NOW()),
  ('faq-fr-shipping', 'fr-FR', NULL, 'delivery',
   'Comment expédier un colis vendu via Shongre ?',
   'Vérifiez d''abord que la commande indique un paiement confirmé. Convenez ensuite du transporteur avec l''acheteur, expédiez le colis avec suivi et renseignez le transporteur ainsi que le numéro de suivi depuis votre espace ventes.',
   'Mes ventes en cours', '/compte/achats', 40, TRUE, NOW()),
  ('faq-fr-verification', 'fr-FR', NULL, 'account',
   'Comment faire vérifier mon profil vendeur ?',
   'Rendez-vous dans votre centre de vérification pour consulter les contrôles requis pour votre compte et l''action demandée. Les statuts affichés sont fournis par le backend après validation.',
   'Vérifier mon profil', '/compte/verification', 50, TRUE, NOW()),
  ('faq-fr-professional', 'fr-FR', NULL, 'pro',
   'Quels services sont disponibles pour un compte professionnel ?',
   'Les services et quotas disponibles dépendent du marché, du plan actif et des droits de l''organisation. Le catalogue professionnel affiche les capacités actuellement proposées par Shongre.',
   'Découvrir les offres Pro', '/solutions-pro', 60, TRUE, NOW()),
  ('faq-fr-fraud', 'fr-FR', NULL, 'safety',
   'Que faire en cas de tentative d''escroquerie ou de message suspect ?',
   'Ne communiquez jamais vos coordonnées bancaires, votre mot de passe ou vos codes SMS. Utilisez le bouton Signaler présent sur l''annonce ou la conversation afin de transmettre le dossier à la modération.',
   'Conseils anti-fraude', '/securite', 70, TRUE, NOW()),
  ('faq-en-payment', 'en-US', NULL, 'transactions',
   'How does online payment work?',
   'Stripe processes the payment and the order shows its current status. Depending on delivery and dispute status, the seller payout may remain pending. Always check the order before handing over an item.',
   'Learn about payment safety', '/securite', 10, TRUE, NOW()),
  ('faq-en-purchase-reservation', 'en-US', NULL, 'transactions',
   'What is the difference between direct purchase and reservation?',
   'Direct purchase is intended for delivery and creates a paid order. A reservation coordinates an in-person handover, with the applicable conditions and amount shown before confirmation.',
   'View my transactions', '/compte/achats', 20, TRUE, NOW()),
  ('faq-en-listing-duration', 'en-US', NULL, 'listings',
   'How long does my listing remain online?',
   'Your listings workspace shows the publication period, current status, expiration date and any available extension options.',
   'Manage my listings', '/compte/annonces', 30, TRUE, NOW()),
  ('faq-en-shipping', 'en-US', NULL, 'delivery',
   'How do I ship an item sold through Shongre?',
   'First verify that the order shows a confirmed payment. Agree on the carrier, ship with tracking, then record the carrier and tracking number from your sales workspace.',
   'View current sales', '/compte/achats', 40, TRUE, NOW()),
  ('faq-en-verification', 'en-US', NULL, 'account',
   'How do I verify my seller profile?',
   'Open your verification center to see the checks required for your account and requested action. Statuses are supplied by the backend after validation.',
   'Open verification', '/compte/verification', 50, TRUE, NOW()),
  ('faq-en-professional', 'en-US', NULL, 'pro',
   'Which services are available to professional accounts?',
   'Available services and quotas depend on the market, active plan and organization permissions. The professional catalogue shows the capabilities currently offered by Shongre.',
   'Explore Pro plans', '/solutions-pro', 60, TRUE, NOW()),
  ('faq-en-fraud', 'en-US', NULL, 'safety',
   'What should I do about suspected fraud or a suspicious message?',
   'Never share bank details, passwords or SMS codes. Use the Report action on the listing or conversation to send the case to moderation.',
   'Read anti-fraud guidance', '/securite', 70, TRUE, NOW());
