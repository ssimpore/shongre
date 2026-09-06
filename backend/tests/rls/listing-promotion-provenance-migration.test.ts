import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00100_listing_market_promotion_provenance.sql",
    import.meta.url,
  ),
  "utf8",
);

const disposableDatabaseUrl =
  process.env.SHONGRE_DISPOSABLE_MIGRATION_DATABASE_URL;

function psqlArguments(sql: string): string[] {
  if (!disposableDatabaseUrl) {
    throw new Error("Disposable migration database URL is not configured.");
  }
  return [
    disposableDatabaseUrl,
    "-X",
    "-v",
    "ON_ERROR_STOP=1",
    "--set=VERBOSITY=verbose",
    "-Atq",
    "-c",
    sql,
  ];
}

function runPsql(sql: string): string {
  const result = spawnSync("psql", psqlArguments(sql), {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql failed");
  }
  return result.stdout.trim();
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

describe("listing market promotion provenance migration", () => {
  it("projects verified source evidence on the exact market publication", () => {
    expect(migration).toContain("promotion_source VARCHAR(40)");
    expect(migration).toContain("promotion_source_id TEXT");
    expect(migration).toContain(
      "promotion.market_code = normalized_market_code",
    );
    expect(migration).toContain("purchase.status = 'paid'");
    expect(migration).toContain("source_order.status = 'paid'");
    expect(migration).toContain("item.product_id = promotion.product_id");
    expect(migration).toContain("promotion_[a-f0-9]{64}");
  });

  it("requires and refreshes provenance for every active projection", () => {
    expect(migration).toContain(
      "promotion_source IN ('purchase', 'subscription_credit', 'admin_grant')",
    );
    expect(migration).toContain("promotion_source = effective.source_type");
    expect(migration).toContain("promotion_source = NULL");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.refresh_listing_market_effective_promotion(UUID, VARCHAR)",
    );
    expect(migration).not.toContain(
      "GRANT EXECUTE ON FUNCTION public.refresh_listing_market_effective_promotion(UUID, VARCHAR)",
    );
  });

  it("fails row-owning refresh triggers closed instead of forming a lock cycle", () => {
    expect(migration).toContain("pg_try_advisory_xact_lock");
    expect(migration).toContain("USING ERRCODE = '40001'");
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toContain(
      "PERFORM public.try_refresh_listing_effective_promotion(NEW.id)",
    );
    expect(migration).toContain(
      "FROM PUBLIC, anon, authenticated, service_role",
    );
  });

  it("invalidates materialized projections whenever source evidence changes", () => {
    expect(migration).toContain(
      "AFTER UPDATE OF status, market_code, quote_id\nON public.monetization_orders",
    );
    expect(migration).toContain(
      "AFTER UPDATE OF market_code, quote_snapshot\nON public.monetization_quotes",
    );
    expect(migration).toContain(
      "AFTER UPDATE OF market_code\nON public.commercial_configuration_versions",
    );
    expect(migration).toContain(
      "AFTER UPDATE OF\n  status, starts_at, ends_at, product_id, account_id, organization_id",
    );
  });

  it("uses the proven current projection for vertical search ordering", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE VIEW public.real_estate_properties_public_search",
    );
    expect(migration).toContain(
      "CREATE OR REPLACE VIEW public.employment_jobs_public_search",
    );
    expect(migration).toContain(
      "publication.listing_id = job.generic_listing_id",
    );
    expect(migration).toContain("publication.promotion_end_at > NOW()");
    expect(migration).toContain("publication.compliance_state = 'approved'");
  });
});

describe.runIf(Boolean(disposableDatabaseUrl))(
  "listing market promotion refresh concurrency",
  () => {
    it("returns 40001, rolls back the contended mutation, and converges after retry", async () => {
      const fixtureKey = randomUUID();
      const sellerId = randomUUID();
      const listingId = randomUUID();
      const promotionId = randomUUID();
      const categoryId = `promotion-concurrency-${fixtureKey}`;
      const expectedLabel = "Boosted concurrent";

      try {
        runPsql(`
            INSERT INTO public.profiles (
              id, slug, email, name, country
            ) VALUES (
              ${sqlLiteral(sellerId)},
              ${sqlLiteral(`promotion-concurrency-${fixtureKey}`)},
              ${sqlLiteral(`promotion-concurrency-${fixtureKey}@example.test`)},
              'Promotion concurrency test',
              'FR'
            );
            INSERT INTO public.categories (id, slug, name) VALUES (
              ${sqlLiteral(categoryId)},
              ${sqlLiteral(categoryId)},
              'Promotion concurrency test'
            );
            INSERT INTO public.listings (
              id, seller_id, publisher_user_id, category_id, title,
              description, price, currency, market_code, city, postal_code,
              country, status
            ) VALUES (
              ${sqlLiteral(listingId)},
              ${sqlLiteral(sellerId)},
              ${sqlLiteral(sellerId)},
              ${sqlLiteral(categoryId)},
              'Promotion concurrency test',
              'Promotion concurrency test',
              100,
              'EUR',
              'FR',
              'Paris',
              '75001',
              'FR',
              'published'
            );
            INSERT INTO public.listing_market_publications (
              listing_id, market_code, status, is_primary, price_minor,
              currency, compliance_state, published_at
            ) VALUES (
              ${sqlLiteral(listingId)},
              'FR',
              'active',
              TRUE,
              10000,
              'EUR',
              'approved',
              NOW()
            );
            INSERT INTO public.listing_promotions (
              id, listing_id, placement_type, source_type,
              admin_grant_reference, status, label, starts_at, ends_at,
              market_code
            ) VALUES (
              ${sqlLiteral(promotionId)},
              ${sqlLiteral(listingId)},
              'featured',
              'admin_grant',
              ${sqlLiteral(`test-${fixtureKey}`)},
              'active',
              'Boosted initial',
              NOW() - INTERVAL '1 hour',
              NOW() + INTERVAL '1 day',
              'FR'
            );
          `);

        let lockHolderStderr = "";
        let lockHolderOutput = "";
        let lockHolderExitCode: number | null = null;
        const mirrorLockKey = `listing-promotion-mirror:${listingId}`;

        const lockHolder = spawn(
          "psql",
          psqlArguments(`
              BEGIN;
              SELECT id
              FROM public.listing_promotions
              WHERE id = ${sqlLiteral(promotionId)}
              FOR UPDATE;
              SELECT pg_catalog.pg_advisory_xact_lock(
                pg_catalog.hashtext(
                  ${sqlLiteral(mirrorLockKey)}
                )
              );
              SELECT pg_catalog.pg_sleep(3);
              UPDATE public.listing_promotions
              SET label = ${sqlLiteral(expectedLabel)}
              WHERE id = ${sqlLiteral(promotionId)};
              COMMIT;
            `),
          { stdio: ["ignore", "pipe", "pipe"] },
        );

        const lockHolderDone = new Promise<void>((resolve, reject) => {
          lockHolder.once("error", reject);
          lockHolder.once("close", (code) => {
            lockHolderExitCode = code;
            if (code === 0) resolve();
            else {
              reject(
                new Error(
                  lockHolderStderr ||
                    lockHolderOutput ||
                    `lock holder exited with ${code}`,
                ),
              );
            }
          });
        });

        lockHolder.stdout?.on("data", (chunk: Buffer) => {
          lockHolderOutput += chunk.toString("utf8");
        });
        lockHolder.stderr?.on("data", (chunk: Buffer) => {
          lockHolderStderr += chunk.toString("utf8");
        });

        let mirrorLockIsHeld = false;
        for (let attempt = 0; attempt < 100; attempt += 1) {
          if (
            runPsql(`
                SELECT NOT pg_catalog.pg_try_advisory_xact_lock(
                  pg_catalog.hashtext(${sqlLiteral(mirrorLockKey)})
                );
              `) === "t"
          ) {
            mirrorLockIsHeld = true;
            break;
          }
          if (lockHolderExitCode !== null) break;
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        expect(mirrorLockIsHeld).toBe(true);

        const contendedMutation = spawnSync(
          "psql",
          psqlArguments(`
              UPDATE public.listing_market_publications
              SET compliance_state = 'restricted'
              WHERE listing_id = ${sqlLiteral(listingId)}
                AND market_code = 'FR';
            `),
          { encoding: "utf8" },
        );

        expect(contendedMutation.status).not.toBe(0);
        expect(contendedMutation.stderr).toContain("40001");
        await lockHolderDone;

        expect(
          runPsql(`
              SELECT CONCAT_WS(
                '|',
                publication.compliance_state,
                publication.promotion_state,
                publication.promotion_label,
                promotion.label
              )
              FROM public.listing_market_publications publication
              JOIN public.listing_promotions promotion
                ON promotion.listing_id = publication.listing_id
              WHERE publication.listing_id = ${sqlLiteral(listingId)}
                AND publication.market_code = 'FR';
            `),
        ).toBe(`approved|active|${expectedLabel}|${expectedLabel}`);

        runPsql(`
            UPDATE public.listing_market_publications
            SET compliance_state = 'restricted'
            WHERE listing_id = ${sqlLiteral(listingId)}
              AND market_code = 'FR';
          `);

        expect(
          runPsql(`
              SELECT CONCAT_WS(
                '|',
                publication.compliance_state,
                publication.promotion_state,
                COALESCE(publication.promotion_label, 'NULL'),
                listing.promotion_state,
                COALESCE(listing.promotion_label, 'NULL')
              )
              FROM public.listing_market_publications publication
              JOIN public.listings listing ON listing.id = publication.listing_id
              WHERE publication.listing_id = ${sqlLiteral(listingId)}
                AND publication.market_code = 'FR';
            `),
        ).toBe("restricted|inactive|NULL|inactive|NULL");
      } finally {
        runPsql(`
            DELETE FROM public.listing_promotions
            WHERE id = ${sqlLiteral(promotionId)};
            DELETE FROM public.listings
            WHERE id = ${sqlLiteral(listingId)};
            DELETE FROM public.profiles
            WHERE id = ${sqlLiteral(sellerId)};
            DELETE FROM public.categories
            WHERE id = ${sqlLiteral(categoryId)};
          `);
      }
    }, 20_000);
  },
);
