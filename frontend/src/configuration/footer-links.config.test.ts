import { describe, expect, it } from "vitest";
import { resolvePublicExternalUrl } from "./footer-links.config";

describe("footer external-link configuration", () => {
  it("accepts verified HTTPS destinations", () => {
    expect(
      resolvePublicExternalUrl("https://www.instagram.com/shongre/", [
        "instagram.com",
      ]),
    ).toBe("https://www.instagram.com/shongre/");
  });

  it("rejects unsafe protocols, credentials and unrelated hosts", () => {
    expect(
      resolvePublicExternalUrl("javascript:alert(1)", ["instagram.com"]),
    ).toBeNull();
    expect(
      resolvePublicExternalUrl("https://user:secret@instagram.com/shongre", [
        "instagram.com",
      ]),
    ).toBeNull();
    expect(
      resolvePublicExternalUrl("https://instagram.com.example.test/shongre", [
        "instagram.com",
      ]),
    ).toBeNull();
  });
});
