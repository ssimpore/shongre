import type { LookupAddress } from "node:dns";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Agent } from "undici";
import { describe, expect, it } from "vitest";
import {
  assertSafeProviderUrl,
  isPublicProviderAddress,
  publicOnlyLookup,
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

describe("provider connection address pinning", () => {
  const resolvingTo =
    (...addresses: string[]) =>
    (
      _hostname: string,
      callback: (
        error: NodeJS.ErrnoException | null,
        addresses: LookupAddress[],
      ) => void,
    ) =>
      callback(
        null,
        addresses.map((address) => ({
          address,
          family: address.includes(":") ? 6 : 4,
        })),
      );
  const lookupWith = (
    lookup: ReturnType<typeof publicOnlyLookup>,
    options: { all?: boolean; family?: number },
  ) =>
    new Promise<{ error: NodeJS.ErrnoException | null; result: unknown }>(
      (resolve) =>
        lookup("provider.example", options as never, (error, result) =>
          resolve({ error, result }),
        ),
    );

  it("dials only public answers, in the shape the socket asked for", async () => {
    const lookup = publicOnlyLookup(
      resolvingTo("93.184.216.34", "2606:2800:220:1::1"),
    );
    await expect(lookupWith(lookup, { all: true })).resolves.toEqual({
      error: null,
      result: [
        { address: "93.184.216.34", family: 4 },
        { address: "2606:2800:220:1::1", family: 6 },
      ],
    });
    await expect(lookupWith(lookup, { family: 6 })).resolves.toMatchObject({
      error: null,
      result: "2606:2800:220:1::1",
    });
  });

  it("refuses a name that answers the connection with a private address", async () => {
    const outcome = await lookupWith(
      publicOnlyLookup(resolvingTo("93.184.216.34", "169.254.169.254")),
      { all: true },
    );
    expect(outcome.error?.code).toBe("ERR_PROVIDER_ADDRESS_NOT_PUBLIC");
  });

  it("never opens a connection to a rebound private address", async () => {
    // A name that passed the endpoint check re-resolves to loopback when the
    // socket connects — the rebinding window this lookup closes.
    let reached = false;
    const server = createServer((_request, response) => {
      reached = true;
      response.end("private");
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const { port } = server.address() as AddressInfo;
    const dispatcher = new Agent({
      connect: { lookup: publicOnlyLookup(resolvingTo("127.0.0.1")) },
    });
    try {
      await expect(
        fetch(`http://rebound.example:${port}/`, {
          dispatcher,
        } as RequestInit),
      ).rejects.toThrow();
      expect(reached).toBe(false);
    } finally {
      await dispatcher.close();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
