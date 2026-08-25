import { describe, expect, it } from "vitest";
import { CAPABILITIES } from "@shongre/contracts/access-control";
import { ALL_PERMISSIONS, getPermissionDisplayName } from "./permissions";

describe("permission presentation metadata", () => {
  it("covers every canonical capability with human-readable copy", () => {
    expect(ALL_PERMISSIONS).toHaveLength(CAPABILITIES.length);

    ALL_PERMISSIONS.forEach((permission) => {
      expect(permission.name.trim(), permission.id).not.toBe("");
      expect(permission.name, permission.id).not.toBe(permission.id);
      expect(permission.description, permission.id).not.toBe(
        "Capacité explicite de la politique d'accès Shongre.",
      );
    });
  });

  it.each([
    ["profile.read", "Consulter un profil public"],
    [
      "provider.routing.manage",
      "Gérer le routage et les fournisseurs de secours",
    ],
    ["commercial_rules.publish", "Publier les règles commerciales"],
    ["courses.manage.own", "Gérer ses cours"],
    ["crm.dashboard.read", "Consulter le tableau de bord CRM"],
    ["marketing.campaigns.approve", "Approuver les campagnes Marketing"],
  ])("renders %s as product copy", (permission, expected) => {
    expect(getPermissionDisplayName(permission)).toBe(expected);
  });
});
