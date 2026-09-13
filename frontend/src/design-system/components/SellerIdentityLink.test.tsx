import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SellerIdentityLink } from "./SellerIdentityLink";

const renderIdentity = (
  props: Partial<ComponentProps<typeof SellerIdentityLink>> = {},
) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <SellerIdentityLink
        to="/profil/camille-martin"
        name="Camille Martin"
        isVerified
        {...props}
      />
    </MemoryRouter>,
  );

describe("SellerIdentityLink", () => {
  it("moves verification beside the seller name and reserves the avatar overlay for presence", () => {
    const now = Date.now();
    const html = renderIdentity({
      presence: {
        status: "online",
        lastSeenAt: new Date(now).toISOString(),
        observedAt: new Date(now).toISOString(),
        validUntil: new Date(now + 30_000).toISOString(),
      },
    });

    expect(html).toContain('data-seller-avatar="true"');
    expect(html).toContain('data-presence-status="online"');
    expect(html).toContain('aria-label="En ligne"');
    expect(html).toContain('data-seller-name="true"');
    expect(html).toContain('data-ui-verification-badge="true"');
    expect(html).toContain(">Vérifié<");
    expect(html).not.toContain('data-ui-verified-icon="true"');
    expect(html.indexOf('data-seller-name="true"')).toBeLessThan(
      html.indexOf('data-ui-verification-badge="true"'),
    );
  });

  it("shows only the professional badge for a verified professional", () => {
    const html = renderIdentity({ isProfessional: true });

    expect(html).toContain('data-ui-pro-badge="true"');
    expect(html).not.toContain('data-ui-verification-badge="true"');
    expect(html).toContain('data-presence-status="unknown"');
    expect(html).toContain('aria-label="Statut indisponible"');
  });
});
