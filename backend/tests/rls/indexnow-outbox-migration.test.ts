import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const outboxMigration = readFileSync(
  new URL(
    "../../supabase/migrations/00112_indexnow_outbox.sql",
    import.meta.url,
  ),
  "utf8",
);
const publicationDeleteMigration = readFileSync(
  new URL(
    "../../supabase/migrations/00113_indexnow_publication_delete.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("IndexNow outbox migrations", () => {
  it("captures every public listing lifecycle edge without storing listing content", () => {
    expect(outboxMigration).toContain("capture_indexnow_publication_event");
    expect(outboxMigration).toContain("capture_indexnow_listing_event");
    expect(outboxMigration).toContain("capture_indexnow_listing_delete_event");
    expect(publicationDeleteMigration).toContain(
      "capture_indexnow_publication_delete_event",
    );
    for (const eventType of [
      "published",
      "updated",
      "sold",
      "expired",
      "removed",
    ]) {
      expect(outboxMigration).toContain(`'${eventType}'`);
    }
    const outboxColumns = outboxMigration.match(
      /CREATE TABLE public\.indexnow_events \(([\s\S]*?)\n\);/,
    )?.[1];
    expect(outboxColumns).toBeTruthy();
    expect(outboxColumns).not.toMatch(
      /^\s+(description|seller_id|email|phone)\s/m,
    );
  });

  it("claims atomically, retries with a cap, and keeps processing service-role only", () => {
    expect(outboxMigration).toContain("FOR UPDATE SKIP LOCKED");
    expect(outboxMigration).toContain("LEAST(1000, p_limit)");
    expect(outboxMigration).toContain("attempt_count >= 8");
    expect(outboxMigration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(outboxMigration).toContain("FORCE ROW LEVEL SECURITY");
    expect(outboxMigration).toContain("FROM PUBLIC, anon, authenticated");
    expect(outboxMigration).toContain("TO service_role");
    expect(publicationDeleteMigration).toContain(
      "FROM PUBLIC, anon, authenticated",
    );
  });
});
