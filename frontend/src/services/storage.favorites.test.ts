import { describe, it, expect, beforeEach } from "vitest";
import { storageService } from "./storage.service";

/**
 * Saved listings belong to an account.
 *
 * They used to live in one shared array, so every account on the device saw the
 * same set: signing in as the pro seller listed the buyer's saved listings back
 * as "Mes annonces favorites", and switching demo persona inherited whatever the
 * previous one had saved. Nothing failed — the count was consistent, the page
 * rendered, axe was happy — it was simply the wrong user's data.
 */
const BUYER = "buyer_thomas";
const PRO = "pro_atelier";
const GUEST = "guest";

beforeEach(() => {
  storageService.remove("shongre_favorites_v2");
  storageService.remove("shongre_favorites_v3");
  storageService.setCurrentUserKey(BUYER);
});

describe("favourites are scoped per account", () => {
  it("keeps one account's saves out of another's", () => {
    storageService.toggleFavorite("list-900", BUYER, "FR");

    expect(storageService.getFavorites(BUYER, "fr")).toContain("list-900");
    expect(storageService.getFavorites(PRO, "FR")).not.toContain("list-900");
  });

  it("defaults to the account that is signed in", () => {
    storageService.setCurrentUserKey(PRO);
    storageService.toggleFavorite("list-901", undefined, "FR");

    expect(storageService.getFavorites(PRO, "FR")).toEqual(["list-901"]);
    expect(storageService.getFavorites(BUYER, "FR")).not.toContain("list-901");
  });

  it("toggles off again without touching other accounts", () => {
    storageService.toggleFavorite("list-902", BUYER, "FR");
    storageService.toggleFavorite("list-902", PRO, "FR");

    expect(storageService.toggleFavorite("list-902", BUYER, "FR")).toBe(false);
    expect(storageService.getFavorites(BUYER, "FR")).not.toContain("list-902");
    expect(storageService.getFavorites(PRO, "FR")).toContain("list-902");
  });

  it("seeds the demo buyer so the fixtures stay deterministic", () => {
    expect(storageService.getFavorites(BUYER, "FR")).toEqual([
      "list-101",
      "list-105",
    ]);
    expect(storageService.getFavorites(PRO, "FR")).toEqual([]);
  });

  it("keeps one market's saves out of another market", () => {
    storageService.toggleFavorite("list-900", BUYER, "FR");

    expect(storageService.getFavorites(BUYER, "FR")).toContain("list-900");
    expect(storageService.getFavorites(BUYER, "BE")).not.toContain("list-900");
  });

  it("does not invent a market for legacy favorites without provenance", () => {
    storageService.remove("shongre_favorites_v3");
    storageService.set("shongre_favorites_v2", {
      [PRO]: ["list-101"],
    });

    expect(storageService.getFavorites(PRO, "FR")).toEqual([]);
    expect(storageService.getFavorites(PRO, "BE")).toEqual([]);
  });
});

describe("signing in carries over what was saved as a guest", () => {
  it("unions the guest saves into the account and clears the guest bucket", () => {
    storageService.toggleFavorite("list-903", GUEST, "FR");
    storageService.setCurrentUserKey(PRO);
    storageService.toggleFavorite("list-904", PRO, "FR");

    storageService.mergeGuestFavorites(undefined, "FR");

    expect(storageService.getFavorites(PRO, "FR")).toEqual(
      expect.arrayContaining(["list-903", "list-904"]),
    );
    // Otherwise the next signed-out visitor on this device inherits them.
    expect(storageService.getFavorites(GUEST, "FR")).toEqual([]);
  });

  it("merges only the guest bucket for the active market", () => {
    storageService.toggleFavorite("list-903", GUEST, "FR");
    storageService.toggleFavorite("list-904", GUEST, "BE");

    storageService.mergeGuestFavorites(PRO, "BE");

    expect(storageService.getFavorites(PRO, "BE")).toEqual(["list-904"]);
    expect(storageService.getFavorites(GUEST, "FR")).toEqual(["list-903"]);
  });

  it("does not duplicate a listing both had saved", () => {
    storageService.toggleFavorite("list-905", GUEST, "FR");
    storageService.toggleFavorite("list-905", PRO, "FR");

    storageService.mergeGuestFavorites(PRO, "FR");

    expect(
      storageService.getFavorites(PRO, "FR").filter((id) => id === "list-905"),
    ).toHaveLength(1);
  });

  it("is a no-op when nothing was saved signed out", () => {
    storageService.toggleFavorite("list-906", PRO, "FR");
    storageService.mergeGuestFavorites(PRO, "FR");

    expect(storageService.getFavorites(PRO, "FR")).toEqual(["list-906"]);
  });
});
