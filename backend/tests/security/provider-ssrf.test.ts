import { describe, expect, it } from "vitest";
import {
  assertSafeProviderUrl,
  isPublicProviderAddress,
} from "../../src/integrations/providers/safe-provider-url.js";

describe("provider endpoint SSRF guard", () => {
  it.each([
    "127.0.0.1",
    "10.4.2.9",
    "169.254.169.254",
    "172.16.0.2",
    "192.168.1.1",
    "::1",
    "fd00::1",
    "fe80::1",
  ])("blocks non-public address %s", (address) => {
    expect(isPublicProviderAddress(address)).toBe(false);
  });

  it("allows a public literal only over the permitted protocol and port", async () => {
    await expect(
      assertSafeProviderUrl("https://8.8.8.8/v1"),
    ).resolves.toMatchObject({
      protocol: "https:",
      hostname: "8.8.8.8",
    });
    await expect(
      assertSafeProviderUrl("http://8.8.8.8/v1"),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    await expect(
      assertSafeProviderUrl("https://8.8.8.8:8443/v1"),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it.each([
    "https://localhost/v1",
    "https://metadata.google.internal/latest",
    "https://user:secret@example.com/v1",
    "https://127.0.0.1/v1",
    "https://169.254.169.254/latest/meta-data",
  ])("rejects unsafe endpoint %s", async (url) => {
    await expect(assertSafeProviderUrl(url)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: { reason: "unsafe_provider_endpoint" },
    });
  });
});
