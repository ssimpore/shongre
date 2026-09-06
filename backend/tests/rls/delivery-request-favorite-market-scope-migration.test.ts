import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00102_delivery_request_favorites.sql",
    import.meta.url,
  ),
  "utf8",
);

const disposableDatabaseUrl =
  process.env.SHONGRE_DISPOSABLE_MIGRATION_DATABASE_URL;

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function runPsql(sql: string): string {
  if (!disposableDatabaseUrl) {
    throw new Error("Disposable migration database URL is not configured.");
  }
  const result = spawnSync(
    "psql",
    [disposableDatabaseUrl, "-X", "-v", "ON_ERROR_STOP=1", "-Atq", "-c", sql],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql failed");
  }
  return result.stdout.trim();
}

describe("delivery request favorite market scope migration", () => {
  it("partitions favorites by account, request, and action market", () => {
    expect(migration).toContain(
      "PRIMARY KEY (user_id, request_id, market_code)",
    );
    expect(migration).toContain("FOREIGN KEY (request_id, market_code)");
    expect(migration).toContain(
      "REFERENCES public.delivery_requests(id, market_code)",
    );
    expect(migration).toContain(
      "ON public.delivery_request_favorites (request_id, market_code)",
    );
  });

  it("allows only an exact, currently open request to be added", () => {
    expect(migration).toContain("request.market_code = normalized_market_code");
    expect(migration).toContain("request.status = 'open'");
    expect(migration).toContain("request.published_at IS NOT NULL");
    expect(migration).toContain("request.expires_at > NOW()");
    expect(migration).toContain("FOR SHARE OF request");
    expect(migration).toContain("profile.status = 'active'");
    expect(migration).toContain("FOR SHARE OF profile");
  });

  it("uses backend-only, idempotent exact-state RPCs", () => {
    expect(migration).toContain("public.list_favorite_delivery_request_ids(");
    expect(migration).toContain("public.set_delivery_request_favorite(");
    expect(migration).toContain("p_is_favorite BOOLEAN");
    expect(migration).toContain("pg_catalog.pg_advisory_xact_lock");
    expect(migration).toContain(
      "ON CONFLICT (user_id, request_id, market_code) DO NOTHING",
    );
    expect(migration).toContain("SET search_path = pg_catalog");
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
  });

  it("keeps removal available after the request becomes unavailable", () => {
    const setterIndex = migration.indexOf(
      "CREATE OR REPLACE FUNCTION public.set_delivery_request_favorite",
    );
    const removalIndex = migration.indexOf(
      "IF NOT p_is_favorite THEN",
      setterIndex,
    );
    const availabilityIndex = migration.indexOf(
      "FROM public.delivery_requests request",
      setterIndex,
    );
    expect(removalIndex).toBeGreaterThan(-1);
    expect(removalIndex).toBeLessThan(availabilityIndex);
    expect(migration).toContain("RETURN FALSE;");
  });

  it("purges favorites in prepare and on the final deleted-profile transition", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.prepare_delivery_account_deletion",
    );
    expect(migration).toContain(
      "DELETE FROM public.delivery_request_favorites favorite",
    );
    expect(migration).toContain("AFTER UPDATE OF status ON public.profiles");
    expect(migration).toContain(
      "WHEN (NEW.status = 'deleted' AND OLD.status IS DISTINCT FROM NEW.status)",
    );
  });
});

describe.runIf(Boolean(disposableDatabaseUrl))(
  "delivery request favorite account deletion",
  () => {
    it("purges through both real account-deletion RPC phases", () => {
      const fixtureKey = randomUUID();
      const userId = randomUUID();
      const ownerId = randomUUID();
      const requestId = randomUUID();

      const counts = runPsql(`
        BEGIN;
        INSERT INTO public.profiles (id, slug, email, name, country)
        VALUES
          (${sqlLiteral(userId)}, ${sqlLiteral(`delivery-favorite-user-${fixtureKey}`)},
           ${sqlLiteral(`delivery-favorite-user-${fixtureKey}@example.test`)},
           'Favorite account deletion test', 'FR'),
          (${sqlLiteral(ownerId)}, ${sqlLiteral(`delivery-favorite-owner-${fixtureKey}`)},
           ${sqlLiteral(`delivery-favorite-owner-${fixtureKey}@example.test`)},
           'Favorite request owner', 'FR');

        INSERT INTO public.delivery_requests (
          id, slug, market_code, requester_id, origin, status, title,
          description, pickup_city, pickup_postal_code, dropoff_city,
          dropoff_postal_code, pickup_starts_at, pickup_ends_at,
          delivery_starts_at, delivery_ends_at, package_type, package_count,
          approximate_weight_grams, idempotency_key, expires_at, published_at
        ) VALUES (
          ${sqlLiteral(requestId)},
          ${sqlLiteral(`delivery-favorite-request-${fixtureKey}`)},
          'FR', ${sqlLiteral(ownerId)}, 'standalone', 'open',
          'Favorite deletion fixture', 'Favorite deletion fixture request',
          'Paris', '75001', 'Lyon', '69001',
          NOW() + INTERVAL '1 hour', NOW() + INTERVAL '2 hours',
          NOW() + INTERVAL '3 hours', NOW() + INTERVAL '4 hours',
          'parcel', 1, 1000, ${sqlLiteral(`delivery-favorite-${fixtureKey}`)},
          NOW() + INTERVAL '1 day', NOW()
        );

        DO $block$
        BEGIN
          IF NOT public.set_delivery_request_favorite(
            ${sqlLiteral(userId)}, ${sqlLiteral(requestId)}, 'FR', TRUE
          ) THEN
            RAISE EXCEPTION 'favorite fixture was not created';
          END IF;
        END
        $block$;
        SELECT COUNT(*) FROM public.delivery_request_favorites
        WHERE user_id = ${sqlLiteral(userId)};

        DO $block$
        BEGIN
          PERFORM public.prepare_delivery_account_deletion(${sqlLiteral(userId)});
        END
        $block$;
        SELECT COUNT(*) FROM public.delivery_request_favorites
        WHERE user_id = ${sqlLiteral(userId)};

        DO $block$
        BEGIN
          IF NOT public.set_delivery_request_favorite(
            ${sqlLiteral(userId)}, ${sqlLiteral(requestId)}, 'FR', TRUE
          ) THEN
            RAISE EXCEPTION 'favorite fixture was not recreated';
          END IF;
        END
        $block$;
        SELECT COUNT(*) FROM public.delivery_request_favorites
        WHERE user_id = ${sqlLiteral(userId)};

        DO $block$
        BEGIN
          PERFORM public.complete_account_deletion(${sqlLiteral(userId)}, NULL);
        END
        $block$;
        SELECT COUNT(*) FROM public.delivery_request_favorites
        WHERE user_id = ${sqlLiteral(userId)};
        ROLLBACK;
      `);

      expect(counts.split("\n")).toEqual(["1", "0", "1", "0"]);
    });
  },
);
