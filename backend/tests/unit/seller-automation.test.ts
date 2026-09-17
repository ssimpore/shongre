import { describe, expect, it, vi } from "vitest";
import {
  CANONICAL_DEMO_LISTINGS,
  DemoListingRepository,
} from "../../src/infrastructure/database/repositories/listing.repository.js";
import { DemoUserRepository } from "../../src/infrastructure/database/repositories/user.repository.js";
import { DemoDiscoveryConfigurationRepository } from "../../src/infrastructure/database/repositories/discovery-configuration.repository.js";
import { UnifiedDiscoveryService } from "../../src/modules/discovery/discovery.service.js";
import { UsersService } from "../../src/modules/users/users.service.js";
import { SellerAutomationWorker } from "../../src/workers/listings/seller-automation-worker.js";
import { notificationsService } from "../../src/modules/notifications/notifications.service.js";
import type { Listing } from "../../src/shared/types/index.js";

const DAY = 86_400_000;
const base = CANONICAL_DEMO_LISTINGS.list_1;

function listing(patch: Partial<Listing> & { id: string }): Listing {
  return {
    ...base,
    marketPublications: base.marketPublications?.map((publication) => ({
      ...publication,
    })),
    ...patch,
  };
}

describe("auto-renew", () => {
  it("extends only opted-in expired listings by their own window, at most three times", async () => {
    const now = Date.now();
    const repository = new DemoListingRepository({
      renewed: listing({
        id: "renewed",
        autoRenew: true,
        publishedAt: new Date(now - 30 * DAY).toISOString(),
        expiresAt: new Date(now - 60_000).toISOString(),
      }),
      capped: listing({
        id: "capped",
        autoRenew: true,
        renewalCount: 3,
        expiresAt: new Date(now - 60_000).toISOString(),
      }),
      optedOut: listing({
        id: "optedOut",
        expiresAt: new Date(now - 60_000).toISOString(),
      }),
      fresh: listing({
        id: "fresh",
        autoRenew: true,
        expiresAt: new Date(now + 10 * DAY).toISOString(),
      }),
    });
    const dispatch = vi
      .spyOn(notificationsService, "dispatchNotification")
      .mockResolvedValue({} as never);
    try {
      const worker = new SellerAutomationWorker(
        repository,
        new DemoUserRepository(),
      );
      await expect(worker.run()).resolves.toMatchObject({ renewed: 1 });
      const renewed = await repository.findById("renewed");
      expect(renewed?.renewalCount).toBe(1);
      expect(renewed?.lastRenewedAt).toBeTruthy();
      // The original 30-day window, not a bump: publishedAt is untouched.
      expect(Date.parse(renewed!.expiresAt) - now).toBeGreaterThan(29 * DAY);
      expect(Date.parse(renewed!.expiresAt) - now).toBeLessThan(31 * DAY);
      expect(Date.parse(renewed!.publishedAt!)).toBeLessThan(now - 7 * DAY);
      expect(Date.parse(renewed!.organicFreshnessAt!)).toBeLessThan(
        now - 7 * DAY,
      );
      expect((await repository.findById("capped"))?.renewalCount).toBe(3);
      expect(
        (await repository.findById("optedOut"))?.lastRenewedAt,
      ).toBeUndefined();
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch.mock.calls[0]?.[1]).toBe("listing_renewed");
    } finally {
      dispatch.mockRestore();
    }
  });
});

describe("scheduled publication", () => {
  it("publishes due drafts with their publications and leaves future ones alone", async () => {
    const now = Date.now();
    const draftPublications = base.marketPublications?.map((publication) => ({
      ...publication,
      status: "draft" as const,
      publishedAt: undefined,
    }));
    const repository = new DemoListingRepository({
      due: listing({
        id: "due",
        status: "draft",
        scheduledPublishAt: new Date(now - 60_000).toISOString(),
        marketPublications: draftPublications,
        publishedAt: undefined,
      }),
      later: listing({
        id: "later",
        status: "draft",
        scheduledPublishAt: new Date(now + DAY).toISOString(),
        marketPublications: draftPublications?.map((p) => ({ ...p })),
      }),
      risky: listing({
        id: "risky",
        status: "draft",
        safetyRiskScore: 80,
        scheduledPublishAt: new Date(now - 60_000).toISOString(),
        marketPublications: draftPublications?.map((p) => ({ ...p })),
      }),
    });
    const dispatch = vi
      .spyOn(notificationsService, "dispatchNotification")
      .mockResolvedValue({} as never);
    try {
      const worker = new SellerAutomationWorker(
        repository,
        new DemoUserRepository(),
      );
      await expect(worker.run()).resolves.toMatchObject({ published: 2 });
      const due = await repository.findById("due");
      expect(due?.status).toBe("published");
      expect(due?.scheduledPublishAt).toBeUndefined();
      expect(due?.publishedAt).toBeTruthy();
      expect(due?.marketPublications?.every((p) => p.status === "active")).toBe(
        true,
      );
      expect((await repository.findById("later"))?.status).toBe("draft");
      // The safety gate applies at the scheduled time like at submission.
      const risky = await repository.findById("risky");
      expect(risky?.status).toBe("flagged");
      expect(
        risky?.marketPublications?.every((p) => p.status === "draft"),
      ).toBe(true);
      expect(dispatch.mock.calls.map((call) => call[1]).sort()).toEqual([
        "listing_scheduled_published",
        "listing_scheduled_review",
      ]);
      // Once published the listing is discoverable.
      const discovery = new UnifiedDiscoveryService(
        repository,
        new DemoDiscoveryConfigurationRepository(),
      );
      const found = await discovery.search({ marketCode: "FR" });
      expect(found.items.map((item) => item.id)).toContain("due");
      expect(found.items.map((item) => item.id)).not.toContain("later");
    } finally {
      dispatch.mockRestore();
    }
  });
});

describe("away mode", () => {
  function setup() {
    const listings = new DemoListingRepository({
      mine: listing({ id: "mine", sellerId: "user_camille" }),
      theirs: listing({ id: "theirs", sellerId: "user_lucas" }),
    });
    const users = new DemoUserRepository(undefined, listings);
    return {
      listings,
      users,
      service: new UsersService(users),
      discovery: new UnifiedDiscoveryService(
        listings,
        new DemoDiscoveryConfigurationRepository(),
      ),
    };
  }

  it("pauses the seller's publications, publishes the absence, and resumes on demand", async () => {
    const { service, discovery, users } = setup();
    const until = new Date(Date.now() + 5 * DAY).toISOString();
    const away = await service.setAwayMode("user_camille", {
      until,
      message: "  De retour lundi.  ",
    });
    expect(away).toMatchObject({
      awayUntil: until,
      awayMessage: "De retour lundi.",
      pausedPublications: 2,
    });
    const hidden = await discovery.search({ marketCode: "FR" });
    expect(hidden.items.map((item) => item.id)).toEqual(["theirs"]);
    const publicProfile = await users.findPublicById("user_camille");
    expect(publicProfile).toMatchObject({
      awayUntil: until,
      awayMessage: "De retour lundi.",
    });

    const back = await service.setAwayMode("user_camille", { until: null });
    expect(back).toMatchObject({
      awayUntil: null,
      awayMessage: null,
      resumedPublications: 2,
    });
    const visible = await discovery.search({ marketCode: "FR" });
    expect(visible.items.map((item) => item.id).sort()).toEqual([
      "mine",
      "theirs",
    ]);
  });

  it("resumes automatically once the date has passed and rejects bad windows", async () => {
    const { service, users, listings, discovery } = setup();
    await expect(
      service.setAwayMode("user_camille", {
        until: new Date(Date.now() - DAY).toISOString(),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.setAwayMode("user_camille", {
        until: new Date(Date.now() + 120 * DAY).toISOString(),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await service.setAwayMode("user_camille", {
      until: new Date(Date.now() + 2 * DAY).toISOString(),
    });
    // The date passes.
    await users.update("user_camille", {
      awayUntil: new Date(Date.now() - 60_000).toISOString(),
    });
    const worker = new SellerAutomationWorker(listings, users);
    await expect(worker.run()).resolves.toMatchObject({ returnedSellers: 1 });
    expect((await users.findById("user_camille"))?.awayUntil).toBeUndefined();
    const visible = await discovery.search({ marketCode: "FR" });
    expect(visible.items.map((item) => item.id)).toContain("mine");
  });
});
