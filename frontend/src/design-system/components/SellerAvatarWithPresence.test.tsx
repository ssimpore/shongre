import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SellerAvatarWithPresence } from "./SellerAvatarWithPresence";

describe("SellerAvatarWithPresence", () => {
  it("reserves the avatar corner for a labelled presence marker", () => {
    const now = Date.now();
    const html = renderToStaticMarkup(
      <SellerAvatarWithPresence
        name="Camille Martin"
        size="2xl"
        presence={{
          status: "online",
          lastSeenAt: new Date(now).toISOString(),
          observedAt: new Date(now).toISOString(),
          validUntil: new Date(now + 30_000).toISOString(),
        }}
      />,
    );

    expect(html).toContain('data-seller-avatar="true"');
    expect(html).toContain('role="img" aria-label="Avatar de Camille Martin"');
    expect(html).toContain('data-presence-status="online"');
    expect(html).toContain('aria-label="En ligne"');
    expect(html).toContain("h-icon-md w-icon-md");
    expect(html).not.toContain('data-ui-verified-icon="true"');
  });

  it("never invents an offline state when presence is unavailable", () => {
    const html = renderToStaticMarkup(
      <SellerAvatarWithPresence name="Camille Martin" />,
    );

    expect(html).toContain('data-presence-status="unknown"');
    expect(html).toContain('aria-label="Statut indisponible"');
  });
});
