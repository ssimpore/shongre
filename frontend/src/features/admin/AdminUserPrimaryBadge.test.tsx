import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { UserProfile } from "../../types";
import { AdminUserPrimaryBadge } from "./AdminUserPrimaryBadge";

const user = (overrides: Partial<UserProfile>): UserProfile =>
  ({
    id: "user",
    email: "user@example.test",
    name: "User",
    accountType: "individual",
    role: "individual_buyer",
    sellerType: "individual",
    status: "active",
    ...overrides,
  }) as UserProfile;

describe("AdminUserPrimaryBadge", () => {
  it("never presents active Staff as Particulier", () => {
    const markup = renderToStaticMarkup(
      <AdminUserPrimaryBadge
        user={user({ staffStatus: "active", staffRole: "support_agent" })}
      />,
    );

    expect(markup).toContain("Équipe Shongre");
    expect(markup).not.toContain("Particulier");
  });

  it("uses customer identity only when active Staff identity does not apply", () => {
    expect(
      renderToStaticMarkup(
        <AdminUserPrimaryBadge
          user={user({ staffStatus: "suspended", staffRole: "admin" })}
        />,
      ),
    ).toContain("Particulier");
    expect(
      renderToStaticMarkup(
        <AdminUserPrimaryBadge
          user={user({ accountType: "professional", sellerType: "pro" })}
        />,
      ),
    ).toContain("Professionnel");
  });
});
