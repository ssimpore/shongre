import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { config } from "../../src/app/config/index.js";
import { createBackendApplication } from "../../src/app/server/index.js";
import { repositories } from "../../src/infrastructure/database/repositories/index.js";
import { PostgresTaxonomyPublicationRepository } from "../../src/infrastructure/database/repositories/taxonomy-publication.repository.js";
import { sessionService } from "../../src/modules/auth/session.service.js";
import { TaxonomyGovernanceService } from "../../src/modules/taxonomy/taxonomy.governance.js";
import { taxonomyV4Service } from "../../src/modules/taxonomy/taxonomy.runtime.js";
import { taxonomyV4TreeResponseSchema } from "@shongre/contracts/taxonomy";

// Explicit opt-in to the repository-owned local stack; never a hosted test.
const enabled = process.env.TAXONOMY_DATABASE_TEST === "local";
describe.skipIf(!enabled)(
  "database → authorized API → published consumer taxonomy",
  () => {
    let app: NestFastifyApplication;
    let base: string;
    let adminToken: string;
    let buyerToken: string;
    let unverifiedToken: string;
    let actorId: string;
    const sessions: { sessionId: string; userId: string }[] = [];
    const repository = new PostgresTaxonomyPublicationRepository();
    const governance = new TaxonomyGovernanceService(repository);
    let original: Awaited<ReturnType<typeof repository.getDraft>>;
    let changed = false;
    let testPublishedRevision: number;
    const headers = (token?: string) => ({
      "Content-Type": "application/json",
      "X-Shongre-Market": "FR",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
    const call = (
      path: string,
      method = "GET",
      body?: unknown,
      token = adminToken,
    ) =>
      fetch(`${base}/api/v1${path}`, {
        method,
        headers: headers(token),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

    beforeAll(async () => {
      expect(config.environment.environment).toBe("local");
      expect(config.dataMode).toBe("database");
      const database = new URL(process.env.DATABASE_URL!);
      expect(["localhost", "127.0.0.1", "[::1]"]).toContain(database.hostname);
      if (process.env.TAXONOMY_BROWSER_TEST === "local") {
        for (const [origin, path] of [
          [process.env.API_URL!, "/readyz"],
          [process.env.PUBLIC_FR_URL!, "/healthz"],
        ]) {
          const url = new URL(path, origin);
          expect(["localhost", "127.0.0.1", "[::1]"]).toContain(url.hostname);
          expect(
            (await fetch(url, { signal: AbortSignal.timeout(10_000) })).status,
            `Connected browser prerequisite ${url.pathname}`,
          ).toBe(200);
        }
      }
      original = await repository.getDraft();
      const admin = await repositories.users.findByEmail(
        "alexandre.meyer@shongre.fr",
      );
      const buyer = await repositories.users.findByEmail(
        "thomas.laurent@example.fr",
      );
      expect(admin).toBeTruthy();
      expect(buyer).toBeTruthy();
      actorId = admin!.id;
      // Persisted test sessions exercise the normal HTTP permission/MFA guards.
      for (const [user, verified] of [
        [admin!, true],
        [buyer!, true],
        [admin!, false],
      ] as const) {
        const session = await sessionService.create(
          user,
          "password",
          { deviceLabel: "Local taxonomy integration test" },
          true,
          verified,
        );
        sessions.push({ sessionId: session.sessionId, userId: user.id });
        if (!verified) unverifiedToken = session.token;
        else if (user.id === actorId) adminToken = session.token;
        else buyerToken = session.token;
      }
      app = await createBackendApplication();
      await app.listen(0, "127.0.0.1");
      base = await app.getUrl();
    }, 120_000);

    afterAll(async () => {
      try {
        if (changed) {
          const current = await repository.getDraft();
          const category = original.bundle.categories.find(
            (row) => row.id === "electronics",
          )!;
          await governance
            .update(
              {
                resource: "categories",
                expectedRevision: current.revision,
                records: [category],
                changeReason: "Restore local integration-test category",
              },
              { actorId },
            )
            .catch((error: unknown) => {
              const cause = (
                error as { originalError?: { code?: string; message?: string } }
              ).originalError;
              throw new Error(
                `Local taxonomy cleanup failed: ${cause?.code ?? "unknown"}; ${cause?.message ?? "no database diagnostic"}`,
                { cause: error },
              );
            });
          const restored = await repository.getDraft();
          await governance.rollback(
            {
              expectedRevision: restored.revision,
              targetRevision: original.publishedRevision,
              changeReason: "Restore original local publication",
            },
            { actorId },
          );
        }
      } finally {
        for (const session of sessions)
          await sessionService.revoke(session.sessionId, session.userId);
        if (app) await app.close();
      }
    }, 120_000);

    it("rejects guests, customers and staff without verified MFA", async () => {
      for (const token of ["", buyerToken, unverifiedToken]) {
        const response = await call(
          "/admin/taxonomy/draft",
          "GET",
          undefined,
          token,
        );
        expect([401, 403]).toContain(response.status);
      }
    });

    it("round-trips edits, isolates drafts, publishes one revision, detects conflicts and rolls back", async () => {
      const before = await taxonomyV4Service.snapshot();
      const row = original.bundle.categories.find(
        (item) => item.id === "electronics",
      )!;
      const label = `Électronique r${original.revision}`;
      const updated = {
        ...row,
        shortLabels: { ...row.shortLabels, "fr-FR": label },
      };
      const saved = await call("/admin/taxonomy/draft", "PUT", {
        resource: "categories",
        expectedRevision: original.revision,
        records: [updated],
        changeReason: "Verify local publication isolation",
      });
      expect(saved.status, await saved.clone().text()).toBe(200);
      changed = true;
      const review = await saved.json();
      expect(review.valid).toBe(true);
      const { getSupabaseAdminClient } =
        await import("../../src/infrastructure/supabase/supabase-client.js");
      const cache = await getSupabaseAdminClient()
        .from("taxonomy_configuration")
        .select(
          "draft_revision,draft_snapshot_revision,draft_snapshot_checksum",
        )
        .single();
      expect(cache.error).toBeNull();
      expect(cache.data?.draft_snapshot_revision).toBe(review.revision);
      expect(cache.data?.draft_snapshot_checksum).toBe(review.checksum);
      // A fresh repository has no process cache and must see the committed edit.
      const coldDraft =
        await new PostgresTaxonomyPublicationRepository().getDraft();
      expect(coldDraft.revision).toBe(review.revision);
      expect(
        coldDraft.bundle.categories.find((item) => item.id === row.id)
          ?.shortLabels["fr-FR"],
      ).toBe(label);
      expect((await taxonomyV4Service.snapshot()).getMetadata()).toEqual(
        before.getMetadata(),
      );
      const exported = await call(
        "/admin/taxonomy/draft?resource=categories&q=electronics&limit=200",
      );
      const draft = await exported.json();
      expect(
        draft.records.find((item: { id: string }) => item.id === "electronics")
          .shortLabels["fr-FR"],
      ).toBe(label);
      const stale = await call("/admin/taxonomy/draft", "PUT", {
        resource: "categories",
        expectedRevision: original.revision,
        records: [updated],
        changeReason: "Reject a stale editor",
      });
      expect(stale.status).toBe(409);
      const published = await call("/admin/taxonomy/publish", "POST", {
        expectedRevision: review.revision,
        changeReason: "Publish integration-test revision",
      });
      expect(published.status, await published.clone().text()).toBe(200);
      const response = await call(
        "/taxonomy/v4/tree?locale=fr-FR",
        "GET",
        undefined,
        "",
      );
      expect(response.headers.get("cache-control")).toContain("no-store");
      const tree = taxonomyV4TreeResponseSchema.parse(await response.json());
      expect(
        tree.items.find((item) => item.id === "electronics")?.shortLabels[
          "fr-FR"
        ],
      ).toBe(label);
      expect(tree.revision).not.toBe(before.revision);
      testPublishedRevision = tree.revision!;
      expect((await taxonomyV4Service.snapshot()).revision).toBe(tree.revision);
      const navigation = await call(
        "/taxonomy/header-navigation",
        "GET",
        undefined,
        "",
      );
      expect(
        (await navigation.json()).items.find(
          (item: { categoryId: string }) => item.categoryId === "electronics",
        ).shortLabels["fr-FR"],
      ).toBe(label);
      const rollback = await call("/admin/taxonomy/rollback", "POST", {
        expectedRevision: review.revision,
        targetRevision: original.publishedRevision,
        changeReason: "Verify safe configuration rollback",
      });
      expect(rollback.status).toBe(200);
      expect((await taxonomyV4Service.snapshot()).revision).toBe(
        before.revision,
      );
    }, 120_000);
    it("denies direct anonymous access and modification of immutable publications", async () => {
      const { getSupabaseAdminClient, getSupabaseAnonClient } =
        await import("../../src/infrastructure/supabase/supabase-client.js");
      const anonymous = getSupabaseAnonClient();
      expect(
        (
          await anonymous
            .from("taxonomy_configuration")
            .select("draft_revision")
        ).error?.code,
      ).toBe("42501");
      expect((await anonymous.rpc("get_taxonomy_draft")).error?.code).toBe(
        "42501",
      );
      expect(testPublishedRevision).toBeTypeOf("number");
      const mutation = await getSupabaseAdminClient()
        .from("taxonomy_publications")
        .update({ change_reason: "Attempt to rewrite immutable test evidence" })
        .eq("revision", testPublishedRevision);
      expect(mutation.error?.code).toBe("23000");
    });

    it.skipIf(process.env.TAXONOMY_BROWSER_TEST !== "local")(
      "publishes through the rendered admin and updates desktop navigation",
      async () => {
        const { chromium, expect: browserExpect } =
          await import("@playwright/test");
        const { tmpdir } = await import("node:os");
        const { join } = await import("node:path");
        const origin = new URL(process.env.PUBLIC_FR_URL!);
        expect(["localhost", "127.0.0.1", "[::1]"]).toContain(origin.hostname);
        const browser = await chromium.launch();
        const context = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        });
        // Server-persisted fixture sessions exercise cookie, MFA, capability and
        // CSRF guards without changing the local Staff account's MFA enrollment.
        await context.addCookies([
          {
            name: "shongre_access",
            value: adminToken,
            url: origin.origin,
            httpOnly: true,
            sameSite: "Lax",
          },
          {
            name: "shongre_csrf",
            value: "taxonomy-local-browser-csrf",
            url: origin.origin,
            sameSite: "Lax",
          },
        ]);
        const page = await context.newPage();
        const failures: string[] = [];
        page.on("pageerror", (error) => failures.push(error.message));
        try {
          await page.goto(new URL("/admin/taxonomie", origin).href);
          const editor = page.getByRole("region", {
            name: "Révisions du référentiel",
          });
          await browserExpect(
            editor.getByLabel("Enregistrement", { exact: true }),
          ).toBeVisible({ timeout: 60_000 });
          await editor
            .getByLabel("Enregistrement", { exact: true })
            .selectOption({ label: "Électronique" });
          const definition = editor.getByLabel("Définition structurée (JSON)");
          const row = JSON.parse(await definition.inputValue());
          const label = `Électronique r${(await repository.getDraft()).revision}`;
          await definition.fill(
            JSON.stringify({
              ...row,
              shortLabels: { ...row.shortLabels, "fr-FR": label },
            }),
          );
          await editor
            .getByLabel("Motif de la modification")
            .fill("Verify connected browser publication");
          await editor
            .getByRole("button", {
              name: "Enregistrer le brouillon",
              exact: true,
            })
            .click();
          changed = true;
          await browserExpect(
            editor.getByText("Structure valide", { exact: true }),
          ).toBeVisible({ timeout: 60_000 });
          await editor
            .getByRole("button", { name: "Publier la révision", exact: true })
            .click();
          await browserExpect(
            editor.getByText("Révision publiée.", { exact: true }),
          ).toBeVisible({ timeout: 60_000 });
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({
            path: join(tmpdir(), "shongre-taxonomy-admin-desktop.png"),
            fullPage: true,
          });
          await page.goto(origin.origin);
          const refusal = page.getByRole("button", {
            name: "Tout refuser",
            exact: true,
          });
          if (await refusal.isVisible()) await refusal.click();
          await browserExpect(
            page
              .getByRole("navigation", { name: "Filtres par catégorie" })
              .getByText(label, { exact: true }),
          ).toBeVisible({ timeout: 30_000 });
          await page.setViewportSize({ width: 390, height: 844 });
          await page.goto(new URL("/admin/taxonomie", origin).href);
          await browserExpect(
            page
              .getByRole("region", { name: "Révisions du référentiel" })
              .getByLabel("Définition structurée (JSON)"),
          ).toBeVisible({ timeout: 30_000 });
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);
          await page.screenshot({
            path: join(tmpdir(), "shongre-taxonomy-admin-mobile.png"),
            fullPage: true,
          });
          expect(failures).toEqual([]);
        } catch (error) {
          await page.screenshot({
            path: join(tmpdir(), "shongre-taxonomy-admin-failure.png"),
            fullPage: true,
          });
          throw error;
        } finally {
          await context.close();
          await browser.close();
        }
      },
      240_000,
    );
  },
);
