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
  storageService.setCurrentUserKey(BUYER);
});

describe("favourites are scoped per account", () => {
  it("keeps one account's saves out of another's", () => {
    storageService.toggleFavorite("list-900", BUYER);

    expect(storageService.getFavorites(BUYER)).toContain("list-900");
    expect(storageService.getFavorites(PRO)).not.toContain("list-900");
  });

  it("defaults to the account that is signed in", () => {
    storageService.setCurrentUserKey(PRO);
    storageService.toggleFavorite("list-901");

    expect(storageService.getFavorites(PRO)).toEqual(["list-901"]);
    expect(storageService.getFavorites(BUYER)).not.toContain("list-901");
  });

  it("toggles off again without touching other accounts", () => {
    storageService.toggleFavorite("list-902", BUYER);
    storageService.toggleFavorite("list-902", PRO);

    expect(storageService.toggleFavorite("list-902", BUYER)).toBe(false);
    expect(storageService.getFavorites(BUYER)).not.toContain("list-902");
    expect(storageService.getFavorites(PRO)).toContain("list-902");
  });

  it("seeds the demo buyer so the fixtures stay deterministic", () => {
    expect(storageService.getFavorites(BUYER)).toEqual([
      "list-101",
      "list-105",
    ]);
    expect(storageService.getFavorites(PRO)).toEqual([]);
  });
});

describe("signing in carries over what was saved as a guest", () => {
  it("unions the guest saves into the account and clears the guest bucket", () => {
    storageService.toggleFavorite("list-903", GUEST);
    storageService.setCurrentUserKey(PRO);
    storageService.toggleFavorite("list-904", PRO);

    storageService.mergeGuestFavorites();

    expect(storageService.getFavorites(PRO)).toEqual(
      expect.arrayContaining(["list-903", "list-904"]),
    );
    // Otherwise the next signed-out visitor on this device inherits them.
    expect(storageService.getFavorites(GUEST)).toEqual([]);
  });

  it("does not duplicate a listing both had saved", () => {
    storageService.toggleFavorite("list-905", GUEST);
    storageService.toggleFavorite("list-905", PRO);

    storageService.mergeGuestFavorites(PRO);

    expect(
      storageService.getFavorites(PRO).filter((id) => id === "list-905"),
    ).toHaveLength(1);
  });

  it("is a no-op when nothing was saved signed out", () => {
    storageService.toggleFavorite("list-906", PRO);
    storageService.mergeGuestFavorites(PRO);

    expect(storageService.getFavorites(PRO)).toEqual(["list-906"]);
  });
});
