import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { usePersona } from "./personas";

const seedConsentDecision = async (page: Parameters<typeof usePersona>[0]) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "shongre_cookie_consent_v1",
      JSON.stringify({
        version: 1,
        decidedAt: new Date().toISOString(),
        choices: { analytics: false, advertising: false },
      }),
    );
  });
};

test("keeps every listing-detail commerce action full-width and readable", async ({
  page,
}) => {
  await usePersona(page, "individual_buyer");
  await seedConsentDecision(page);

  for (const width of [1024, 1065, 1280, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/annonce/list-113", { waitUntil: "networkidle" });
    await waitForStableLayout(page);

    const actionGroup = page.getByTestId("listing-desktop-actions");
    const actions = actionGroup.getByRole("button");
    await expect(actions).toHaveCount(4);

    const groupBox = await actionGroup.boundingBox();
    expect(groupBox, `missing action group at ${width}px`).not.toBeNull();

    for (const action of await actions.all()) {
      await expect(action, `hidden action at ${width}px`).toBeVisible();
      const actionBox = await action.boundingBox();
      expect(actionBox, `missing action geometry at ${width}px`).not.toBeNull();
      expect(
        Math.round(actionBox!.width),
        `non-full-width action at ${width}px`,
      ).toBe(Math.round(groupBox!.width));
      expect(
        await action.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
        `clipped action label at ${width}px`,
      ).toBe(true);
    }

    await expectNoHorizontalOverflow(page, `listing actions at ${width}px`);
  }

  await page.setViewportSize({ width: 1065, height: 701 });
  await page.goto("/annonce/list-113", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Offre de prix", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Faire une offre de prix" }),
  ).toBeVisible();
});
