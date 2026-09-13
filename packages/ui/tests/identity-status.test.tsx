import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps, ElementType } from "react";
import { describe, expect, expectTypeOf, it } from "vitest";
import { Avatar } from "../src/primitives/Avatar.web";
import { ProBadge } from "../src/identity/ProBadge.web";
import { PresenceIndicator } from "../src/identity/PresenceIndicator.web";
import { VerificationBadge } from "../src/identity/VerificationBadge.web";
import { VerifiedIcon } from "../src/identity/VerifiedIcon.web";

describe("canonical identity status components", () => {
  it("does not expose application-level style overrides", () => {
    type UnsupportedProps<Component extends ElementType> = Extract<
      keyof ComponentProps<Component>,
      "className" | "style"
    >;

    expectTypeOf<
      UnsupportedProps<typeof VerifiedIcon>
    >().toEqualTypeOf<never>();
    expectTypeOf<
      UnsupportedProps<typeof VerificationBadge>
    >().toEqualTypeOf<never>();
    expectTypeOf<UnsupportedProps<typeof ProBadge>>().toEqualTypeOf<never>();
    expectTypeOf<
      UnsupportedProps<typeof PresenceIndicator>
    >().toEqualTypeOf<never>();
  });

  it("renders every presence state with a labelled token-backed marker", () => {
    const statuses = ["online", "away", "offline", "unknown"] as const;
    const html = statuses.map((status) =>
      renderToStaticMarkup(
        <PresenceIndicator status={status} label={`Presence ${status}`} />,
      ),
    );

    expect(html[0]).toContain('data-presence-status="online"');
    expect(html[0]).toContain("bg-success");
    expect(html[1]).toContain("bg-warning");
    expect(html[2]).toContain("bg-text-tertiary");
    expect(html[3]).toContain("bg-text-disabled");
    html.forEach((markup) => {
      expect(markup).toContain('data-ui-presence-indicator="true"');
      expect(markup).toContain('role="img"');
      expect(markup).toContain("aria-label=");
      expect(markup).toContain("border-border-base");
    });
  });

  it("labels a standalone verification icon and hides a decorative one", () => {
    const labelled = renderToStaticMarkup(
      <VerifiedIcon size="md" label="Profil vérifié" />,
    );
    const decorative = renderToStaticMarkup(<VerifiedIcon size="xs" />);

    expect(labelled).toContain('data-ui-verified-icon="true"');
    expect(labelled).toContain('role="img"');
    expect(labelled).toContain('aria-label="Profil vérifié"');
    expect(labelled).toContain("h-icon-md w-icon-md");
    expect(labelled).toContain("lucide-badge-check");
    expect(labelled).toContain("h-full w-full fill-success");
    expect(decorative).toContain('aria-hidden="true"');
  });

  it("renders verification facts with one token-backed recipe", () => {
    const html = renderToStaticMarkup(
      <VerificationBadge label="Vérifié" accessibilityLabel="Profil vérifié" />,
    );

    expect(html).toContain('data-ui-verification-badge="true"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Profil vérifié"');
    expect(html).toContain("bg-success-surface");
    expect(html).toContain("border-success-border");
    expect(html).toContain('data-ui-verified-icon="true"');
  });

  it("keeps the canonical verification badge when its icon is redundant", () => {
    const html = renderToStaticMarkup(
      <VerificationBadge
        label="Vérifié"
        accessibilityLabel="Profil vérifié"
        showIcon={false}
      />,
    );

    expect(html).toContain('data-ui-verification-badge="true"');
    expect(html).toContain('aria-label="Profil vérifié"');
    expect(html).toContain(">Vérifié<");
    expect(html).not.toContain('data-ui-verified-icon="true"');
  });

  it("keeps the professional marker inverse by default and supports the card tone", () => {
    const defaultHtml = renderToStaticMarkup(
      <ProBadge
        label="Pro"
        accessibilityLabel="Compte professionnel"
        size="xs"
      />,
    );
    const cardHtml = renderToStaticMarkup(
      <ProBadge
        label="Pro"
        accessibilityLabel="Compte professionnel"
        size="xs"
        tone="primary"
      />,
    );

    expect(defaultHtml).toContain('data-ui-pro-badge="true"');
    expect(defaultHtml).toContain('role="img"');
    expect(defaultHtml).toContain('aria-label="Compte professionnel"');
    expect(defaultHtml).toContain("bg-surface-inverse");
    expect(defaultHtml).toContain("text-text-inverse");
    expect(cardHtml).toContain("bg-primary-light");
    expect(cardHtml).toContain("text-text-main");
    expect(cardHtml).toContain("text-overline");
    expect(cardHtml).not.toContain("uppercase");
  });

  it("keeps every public size on the canonical token-backed scale", () => {
    const verificationSizes = (["xs", "sm", "md"] as const).map((size) =>
      renderToStaticMarkup(<VerificationBadge label="Vérifié" size={size} />),
    );
    const iconSizes = (["xs", "sm", "md", "lg"] as const).map((size) =>
      renderToStaticMarkup(<VerifiedIcon size={size} />),
    );

    expect(verificationSizes[0]).toContain("text-overline");
    expect(verificationSizes[1]).toContain("text-micro");
    expect(verificationSizes[2]).toContain("text-xs");
    expect(iconSizes[0]).toContain("h-icon-xs w-icon-xs");
    expect(iconSizes[1]).toContain("h-icon-sm w-icon-sm");
    expect(iconSizes[2]).toContain("h-icon-md w-icon-md");
    expect(iconSizes[3]).toContain("h-icon-lg w-icon-lg");
  });

  it("composes the same verification mark into avatars", () => {
    const html = renderToStaticMarkup(
      <Avatar
        name="Thomas Laurent"
        size="lg"
        isVerified
        verifiedLabel="Profil vérifié"
      />,
    );

    expect(html).toContain('data-ui-verified-icon="true"');
    expect(html).toContain('aria-label="Profil vérifié"');
    expect(html).not.toContain("✓");
  });
});
