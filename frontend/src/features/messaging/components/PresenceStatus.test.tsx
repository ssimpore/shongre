import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PresenceStatus } from "./PresenceStatus";

describe("PresenceStatus", () => {
  it("renders text as well as color for a fresh online status", () => {
    const now = Date.now();
    const html = renderToStaticMarkup(
      <PresenceStatus
        presence={{
          status: "online",
          lastSeenAt: new Date(now).toISOString(),
          observedAt: new Date(now).toISOString(),
          validUntil: new Date(now + 30_000).toISOString(),
        }}
      />,
    );
    expect(html).toContain('data-presence-status="online"');
    expect(html).toContain("En ligne");
  });

  it("renders unavailable when the snapshot expired", () => {
    const now = Date.now();
    const html = renderToStaticMarkup(
      <PresenceStatus
        presence={{
          status: "offline",
          lastSeenAt: new Date(now - 60_000).toISOString(),
          observedAt: new Date(now - 60_000).toISOString(),
          validUntil: new Date(now - 1).toISOString(),
        }}
        lastSeen
      />,
    );
    expect(html).toContain('data-presence-status="unknown"');
    expect(html).toContain("Statut indisponible");
    expect(html).not.toContain("Vu le");
  });

  it("shows last seen for a fresh offline status", () => {
    const now = Date.now();
    const html = renderToStaticMarkup(
      <PresenceStatus
        presence={{
          status: "offline",
          lastSeenAt: new Date(now - 60_000).toISOString(),
          observedAt: new Date(now).toISOString(),
          validUntil: new Date(now + 30_000).toISOString(),
        }}
        lastSeen
      />,
    );
    expect(html).toContain("Hors ligne");
    expect(html).toContain("Vu le");
  });
});
