import { describe, expect, it } from "vitest";
import type { PropertyDraft } from "@shongre/contracts/real-estate";
import { DemoRealEstateService } from "./demo-real-estate.service";

const completeDraft = (id: string): PropertyDraft => ({
  id,
  ownerUserId: "owner_new",
  schemaVersion: 1,
  marketCode: "FR",
  currentStep: 10,
  completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  data: { offerId: "immo_owner_visibility" },
  validationIssues: [],
  updatedAt: "2026-08-22T10:00:00.000Z",
});

describe("DemoRealEstateService", () => {
  it("returns deterministic filtered results without exact addresses", async () => {
    const service = new DemoRealEstateService();
    const query = {
      marketCode: "FR" as const,
      transactionTypes: ["sale" as const],
      city: "Lyon",
      sort: "price_asc" as const,
      limit: 20,
    };
    const first = await service.searchProperties(query);
    const second = await service.searchProperties(query);
    expect(second).toEqual(first);
    expect(first.items.length).toBeGreaterThan(0);
    expect(first.items.every((item) => !("exactAddress" in item.address))).toBe(
      true,
    );
  });

  it("isolates recently viewed history by account", async () => {
    const service = new DemoRealEstateService();
    await service.markRecentlyViewed("account_a", "property_house_ecully");
    expect((await service.getRecentlyViewed("account_a"))[0].id).toBe(
      "property_house_ecully",
    );
    expect(await service.getRecentlyViewed("account_b")).toEqual([]);
  });

  it("requires consent and deduplicates structured property leads", async () => {
    const service = new DemoRealEstateService();
    const input = {
      propertyId: "property_rental_lyon",
      type: "visit" as const,
      requesterName: "Acheteur Test",
      requesterEmail: "buyer@example.fr",
      message: "Je souhaite organiser une visite de ce bien.",
      preferredContactChannel: "email" as const,
      consentGiven: true,
      qualificationAnswers: { moveDate: "2026-09" },
    };
    const first = await service.submitLead(input);
    const duplicate = await service.submitLead(input);
    expect(duplicate.id).toBe(first.id);
    await expect(
      service.submitLead({
        ...input,
        requesterEmail: "no-consent@example.fr",
        consentGiven: false,
      }),
    ).rejects.toThrow(/accord/i);
  });

  it("autosaves and submits complete drafts through the adapter", async () => {
    const service = new DemoRealEstateService();
    await service.saveDraft(completeDraft("draft-immo-complete"));
    await expect(
      service.submitDraft("draft-immo-complete"),
    ).resolves.toMatchObject({ lifecycle: "pending_review" });
    await expect(service.submitDraft("missing")).rejects.toThrow(/complétez/i);
  });

  it("keeps private files private and rejects unsafe upload formats", async () => {
    const service = new DemoRealEstateService();
    await expect(
      service.uploadDraftMedia(
        "draft",
        { name: "dpe.pdf", type: "application/pdf", size: 500_000 },
        "private",
      ),
    ).resolves.toEqual({
      privateStorageKey: "documents-private/immo/draft/dpe.pdf",
    });
    await expect(
      service.uploadDraftMedia(
        "draft",
        { name: "script.js", type: "text/javascript", size: 500 },
        "public",
      ),
    ).rejects.toThrow(/format/i);
  });

  it("makes checkout retries idempotent with integer minor units", async () => {
    const service = new DemoRealEstateService();
    const input = {
      accountId: "owner_new",
      marketCode: "FR",
      offerId: "immo_owner_visibility",
      addOnIds: ["immo_bump"],
      idempotencyKey: "immo-checkout-test-001",
      scenario: "success" as const,
    };
    const first = await service.createCheckout(input);
    const retry = await service.createCheckout(input);
    expect(retry.id).toBe(first.id);
    expect(first.status).toBe("paid");
    expect(Number.isInteger(first.total.amountMinor)).toBe(true);
    await expect(
      service.refundCheckout(first.id, {
        idempotencyKey: "immo-refund-test-001",
      }),
    ).resolves.toMatchObject({ status: "refunded" });

    const failed = await service.createCheckout({
      ...input,
      idempotencyKey: "immo-checkout-failed-001",
      scenario: "failed",
    });
    expect(failed.status).toBe("failed");
  });
});
