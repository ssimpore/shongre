import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StaffBadge, VerificationBadge } from "./IdentityBadges";

describe("internal and customer identity badges", () => {
  it("renders unmistakably distinct active Staff and verification facts", () => {
    const staff = renderToStaticMarkup(
      <StaffBadge status="active" roleLabel="Support" />,
    );
    const verification = renderToStaticMarkup(
      <VerificationBadge verified accountType="individual" />,
    );

    expect(staff).toContain("staff-active");
    expect(staff).toContain("Équipe Shongre");
    expect(staff).toContain("Membre actif de l’équipe Shongre");
    expect(staff).toContain("lucide-building-2");
    expect(staff).toContain("violet");

    expect(verification).toContain("verification");
    expect(verification).toContain("Identité vérifiée");
    expect(verification).toContain("lucide-badge-check");
    expect(verification).toContain("success");
    expect(verification).not.toContain("Équipe Shongre");
  });

  it("never presents suspended or revoked memberships as active Staff", () => {
    expect(renderToStaticMarkup(<StaffBadge status="suspended" />)).toBe("");
    expect(renderToStaticMarkup(<StaffBadge status="revoked" />)).toBe("");
    expect(
      renderToStaticMarkup(
        <StaffBadge status="suspended" showLifecycle roleLabel="Support" />,
      ),
    ).toContain("Staff suspendu");
    expect(
      renderToStaticMarkup(<StaffBadge status="revoked" showLifecycle />),
    ).toContain("Staff révoqué");
  });

  it("uses professional verification wording independently of Staff", () => {
    const verification = renderToStaticMarkup(
      <VerificationBadge verified accountType="professional" />,
    );
    expect(verification).toContain("Professionnel vérifié");
    expect(verification).not.toContain("staff-active");
  });
});
