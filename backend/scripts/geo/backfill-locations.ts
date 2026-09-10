import { getSupabaseAdminClient } from "../../src/infrastructure/supabase/supabase-client.js";
import { logger } from "../../src/infrastructure/logging/logger.js";
import {
  geoConfig,
  geocodingService,
} from "../../src/modules/geo/geo.runtime.js";
import {
  backfillQuery,
  decideBackfill,
  emptyBackfillReport,
  recordDecision,
  rejectsBulkGeocodingEndpoint,
  type BackfillCandidate,
  type BackfillReport,
} from "../../src/modules/geo/geo.backfill.js";

/**
 * Gives existing listings a coordinate, so spatial search can find them.
 *
 * The point of this is narrower than it looks. The public projection already
 * resolves a town to a coordinate at render time, so a listing without a stored
 * point still *shows* on a map. What it cannot do is be *found*: `ST_DWithin`
 * filters on a column, and a row whose `geographic_point` is null is invisible
 * to every radius and viewport search no matter what the projection would have
 * drawn. This fills that column.
 *
 * It is a separate command and not part of a migration for one reason: it talks
 * to a third party under a rate limit. Geocoding a catalogue inside a migration
 * would hold a transaction open across thousands of network round-trips and
 * make a deployment's duration a function of someone else's latency.
 *
 * Four properties matter more than throughput:
 *
 *   * **Resumable.** It selects only rows that still have no point, so stopping
 *     it and running it again continues rather than restarts. There is no
 *     cursor to lose.
 *   * **Idempotent.** A row it already resolved is not in the next selection.
 *   * **Bounded.** Every run has a limit. A command that can run for an
 *     unknown length of time against a shared provider is one nobody will dare
 *     start.
 *   * **Honest.** It never invents a coordinate. Everything it refuses is
 *     counted and reported rather than silently skipped.
 */

interface Options {
  limit: number;
  batchSize: number;
  marketCode?: string;
  dryRun: boolean;
  /** Milliseconds between upstream requests. Bulk pacing, not the API's. */
  intervalMs: number;
  /** Rows attempted more recently than this are left for a later run. */
  retryAfterDays: number;
}

function parseOptions(argv: readonly string[]): Options {
  const value = (name: string) => {
    const prefix = `--${name}=`;
    const found = argv.find((argument) => argument.startsWith(prefix));
    return found?.slice(prefix.length);
  };
  const integer = (
    name: string,
    fallback: number,
    min: number,
    max: number,
  ) => {
    const raw = value(name);
    if (raw === undefined) return fallback;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      throw new Error(
        `--${name} must be an integer between ${min} and ${max}.`,
      );
    }
    return parsed;
  };
  return {
    limit: integer("limit", 500, 1, 100_000),
    batchSize: integer("batch-size", 50, 1, 500),
    marketCode: value("market")?.toUpperCase(),
    dryRun: argv.includes("--dry-run"),
    /* One second is the strictest published cadence among the services this
       adapter speaks to, so it is the default rather than the floor of one. */
    intervalMs: integer("interval-ms", 1_000, 0, 60_000),
    retryAfterDays: integer("retry-after-days", 7, 0, 365),
  };
}

const sleep = (ms: number) =>
  ms > 0
    ? new Promise((resolve) => setTimeout(resolve, ms))
    : Promise.resolve();

interface ListingRow {
  id: string;
  city: string | null;
  postal_code: string | null;
  country: string;
  market_code: string;
}

async function selectCandidates(
  options: Options,
  attemptedBefore: string,
  take: number,
): Promise<ListingRow[]> {
  let query = (getSupabaseAdminClient() as any)
    .from("listings")
    .select("id, city, postal_code, country, market_code")
    .is("geographic_point", null)
    /* A row attempted recently is one the provider already declined to place.
       Asking again on the next run spends the same budget for the same answer. */
    .or(`geocoded_at.is.null,geocoded_at.lt.${attemptedBefore}`)
    .order("created_at", { ascending: true })
    .limit(take);
  if (options.marketCode) query = query.eq("market_code", options.marketCode);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ListingRow[];
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));

  if (geoConfig.geocoding.provider === "disabled") {
    throw new Error(
      "Geocoding is disabled. Set GEOCODING_PROVIDER and GEOCODING_BASE_URL to an endpoint this deployment is entitled to use in bulk.",
    );
  }
  if (rejectsBulkGeocodingEndpoint(geoConfig.geocoding.baseUrl)) {
    throw new Error(
      "Refusing to backfill against the public Nominatim instance. Its usage policy forbids bulk use; point GEOCODING_BASE_URL at a self-hosted or managed endpoint.",
    );
  }

  const attemptedBefore = new Date(
    Date.now() - options.retryAfterDays * 24 * 60 * 60 * 1_000,
  ).toISOString();
  const report: BackfillReport = emptyBackfillReport();
  const startedAt = Date.now();
  let processed = 0;
  /*
   * Rows already handled in this run.
   *
   * A real run does not need this: a stored row gains a point and a refused one
   * gains an attempt timestamp, so neither is selected again. A dry run writes
   * nothing, so without this it re-reads the same rows until it hits the limit
   * and reports each of them several times — which is exactly the number an
   * operator would use to decide whether to run it for real.
   *
   * It also makes the loop terminate on its own if a write ever silently fails
   * to exclude a row, instead of spinning against a rate-limited provider.
   */
  const seen = new Set<string>();

  while (processed < options.limit) {
    const take = Math.min(options.batchSize, options.limit - processed);
    const rows = (
      await selectCandidates(options, attemptedBefore, take)
    ).filter((row) => !seen.has(row.id));
    if (!rows.length) break;

    for (const row of rows) {
      processed += 1;
      seen.add(row.id);
      const candidate: BackfillCandidate = {
        id: row.id,
        city: row.city,
        postalCode: row.postal_code,
        countryCode: row.country,
      };

      const query = backfillQuery(candidate);
      let results: Awaited<ReturnType<typeof geocodingService.forward>> = [];
      if (query) {
        try {
          results = await geocodingService.forward({
            query,
            countryCode: candidate.countryCode,
          });
        } catch (error) {
          /* An upstream failure is not a decision about the listing. It is
             counted separately so a run that lost the provider halfway is not
             mistaken for a catalogue full of unresolvable towns. */
          report.failed += 1;
          logger.warn("geo_backfill_provider_failed", {
            listingId: row.id,
            marketCode: row.market_code,
            error: error instanceof Error ? error.name : "unknown",
          });
          await sleep(options.intervalMs);
          continue;
        }
      }

      const decision = decideBackfill(candidate, results);
      recordDecision(report, decision);

      if (!options.dryRun) {
        const attemptedAt = new Date().toISOString();
        const update =
          decision.action === "store"
            ? {
                latitude: decision.coordinate.latitude,
                longitude: decision.coordinate.longitude,
                /* The point is derived from the pair by trigger, so writing the
                   pair keeps one definition of that conversion. */
                location_precision: decision.precision,
                location_source: "geocoded",
                geocoding_provider: decision.provider,
                normalized_address: decision.normalizedAddress,
                administrative_area: decision.administrativeArea,
                geocoded_at: attemptedAt,
              }
            : { geocoded_at: attemptedAt };
        const { error } = await (getSupabaseAdminClient() as any)
          .from("listings")
          .update(update)
          .eq("id", row.id);
        if (error) throw error;
      }

      if (query) await sleep(options.intervalMs);
    }
  }

  const durationMs = Date.now() - startedAt;
  logger.info("geo_backfill_completed", {
    ...report,
    marketCode: options.marketCode ?? null,
    dryRun: options.dryRun,
    durationMs,
  });

  /* Printed as well as logged: an operator running this by hand is the intended
     reader, and a structured log line is not a report they can act on. */
  const skipped = Object.entries(report.skipped)
    .filter(([, count]) => count > 0)
    .map(([reason, count]) => `${reason}=${count}`)
    .join(" ");
  console.log(
    [
      options.dryRun ? "Geo backfill (dry run)" : "Geo backfill",
      `attempted=${report.attempted}`,
      `stored=${report.stored}`,
      skipped ? `skipped: ${skipped}` : "skipped: none",
      `provider_failures=${report.failed}`,
      `duration=${Math.round(durationMs / 1_000)}s`,
    ].join(" · "),
  );
  if (processed >= options.limit) {
    console.log(
      "Reached the run limit. Run again to continue; rows already resolved are not reselected.",
    );
  }
}

await main();
