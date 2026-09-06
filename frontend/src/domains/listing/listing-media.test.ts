import { describe, expect, it } from "vitest";
import { resolveListingPhotoUrl } from "./listing-media";

describe("listing media projection", () => {
  it("accepts real legacy media shapes and keeps missing media absent", () => {
    expect(resolveListingPhotoUrl(" https://example.test/photo.jpg ")).toBe(
      "https://example.test/photo.jpg",
    );
    expect(
      resolveListingPhotoUrl({ url: "https://example.test/photo-2.jpg" }),
    ).toBe("https://example.test/photo-2.jpg");
    expect(resolveListingPhotoUrl(undefined)).toBeUndefined();
    expect(resolveListingPhotoUrl({})).toBeUndefined();
    expect(resolveListingPhotoUrl(" ")).toBeUndefined();
  });
});
