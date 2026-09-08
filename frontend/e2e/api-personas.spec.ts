import { expect, test } from "@playwright/test";
import { browserApi } from "./browser-api";
import {
  useEstablishedConsent,
  usePersona,
  type PersonaName,
} from "./personas";

test.use({ trace: "off", screenshot: "off", video: "off" });

const staffPersonas = new Set<PersonaName>([
  "support",
  "moderator",
  "trust_safety",
  "compliance",
  "operations",
  "finance",
  "commercial",
  "admin",
  "super_admin",
]);

test("local storage cannot impersonate a user or resurrect the retired switcher", async ({
  page,
}) => {
  await useEstablishedConsent(page);
  await usePersona(page, "guest");
  await page.addInitScript(() => {
    localStorage.setItem(
      "shongre_current_user_key_v1",
      JSON.stringify("admin_antoine"),
    );
    localStorage.setItem("shongre_current_role_v1", JSON.stringify("admin"));
  });
  await page.goto("/");
  expect((await browserApi(page, "/auth/me")).body.id).toBeUndefined();
  await expect(
    page.getByRole("link", { name: "Se connecter", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[aria-controls="demo-persona-menu"]')).toHaveCount(
    0,
  );
  expect(
    (await browserApi(page, "/listing-drafts", { method: "POST" })).status,
  ).toBe(401);
});

for (const persona of [
  "individual_buyer",
  "individual_seller",
  "pro_seller",
  "pro_auto",
  "pro_immo",
  "pro_courses",
  "pro_employment",
  "standalone_prospects",
  "standalone_facturation",
  "support",
  "moderator",
  "trust_safety",
  "compliance",
  "operations",
  "finance",
  "commercial",
  "admin",
  "super_admin",
] satisfies PersonaName[]) {
  test(`${persona} has an API-owned session that survives reload and is revoked by logout`, async ({
    page,
  }) => {
    await useEstablishedConsent(page);
    await usePersona(page, persona);
    const before = await browserApi(page, "/auth/me");
    await page.goto("/");
    await page.reload();
    const restored = await browserApi(page, "/auth/me");
    expect(restored.body.id).toBe(before.body.id);
    await expect(
      page.locator('[aria-controls="demo-persona-menu"]'),
    ).toHaveCount(0);
    if (staffPersonas.has(persona)) {
      expect(restored.body.staffStatus).toBe("active");
      expect((await browserApi(page, "/auth/mfa")).body.sessionVerified).toBe(
        true,
      );
      expect(
        (await browserApi(page, "/listing-drafts", { method: "POST" })).status,
      ).toBe(403);
      await expect(page.getByTestId("staff-marketplace-mode")).toHaveAttribute(
        "data-mode",
        "read-only",
      );
    }
    await page.goto("/healthz", { waitUntil: "load" });
    expect(
      (await browserApi(page, "/auth/logout", { method: "POST", body: {} }))
        .status,
    ).toBe(200);
    expect((await browserApi(page, "/auth/me")).body.id).toBeUndefined();
  });
}
