import { expect, test } from "@playwright/test";
import { browserApi } from "./browser-api";
import { useEstablishedConsent, usePersona } from "./personas";
import { waitForStableLayout } from "./overflow";

test("course onboarding clears dependent levels and restores published selections", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await useEstablishedConsent(page);
  await usePersona(page, "individual_seller");
  await page.setViewportSize({ width: 390, height: 844 });
  const initial = await browserApi(
    page,
    "/education/workflow-drafts/tutor-onboarding",
  );
  expect(initial.status).toBe(200);
  await page.goto("/deposer/education?step=profile");
  await page.getByLabel("Nom public").fill("Camille Martin");
  await page.getByRole("button", { name: /^Continuer/ }).click();
  await waitForStableLayout(page);
  const subjects = page.getByRole("group", { name: "Matières", exact: true });
  await expect(subjects).toBeVisible();
  for (const checkbox of await subjects.getByRole("checkbox").all()) {
    if (await checkbox.isChecked()) await checkbox.uncheck();
  }
  await expect
    .poll(
      async () =>
        (await browserApi(page, "/education/workflow-drafts/tutor-onboarding"))
          .body.levelIds,
    )
    .toEqual([]);
  const firstSubject = subjects.getByRole("checkbox").first();
  const subjectLabel = await firstSubject.getAttribute("aria-label");
  await firstSubject.check();
  await waitForStableLayout(page);
  const levels = page.getByRole("group", { name: "Niveaux", exact: true });
  await levels.getByRole("checkbox").first().check();
  await expect
    .poll(
      async () =>
        (await browserApi(page, "/education/workflow-drafts/tutor-onboarding"))
          .body.levelIds,
    )
    .toEqual(expect.arrayContaining([expect.any(String)]));
  await page.reload();
  await page.getByRole("button", { name: /^Continuer/ }).click();
  await expect(subjects.getByRole("checkbox").first()).toBeChecked();
  await expect(levels.getByRole("checkbox").first()).toBeChecked();
  if (subjectLabel)
    await expect(subjects.getByRole("checkbox").first()).toHaveAttribute(
      "aria-label",
      subjectLabel,
    );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("employment onboarding clears incompatible specializations and recovers from a catalogue failure", async ({
  page,
}) => {
  await useEstablishedConsent(page);
  await usePersona(page, "pro_employment");
  const created = await browserApi(page, "/employment/drafts", {
    method: "POST",
    body: { marketCode: "FR" },
  });
  expect(created.status).toBe(200);
  const draftId = String(created.body.id);
  const saved = await browserApi(page, `/employment/drafts/${draftId}`, {
    method: "PUT",
    body: {
      marketCode: "FR",
      currentStep: 2,
      data: {
        professionId: "employment.fr.profession.frontend_engineer",
        specializationId: "employment.fr.specialization.react",
        industryId: "employment.fr.sector.technology",
      },
    },
  });
  expect(saved.status).toBe(200);
  let failCatalog = true;
  await page.route("**/employment/catalog*", async (route) => {
    if (failCatalog)
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Service unavailable",
          },
        }),
      });
    else await route.continue();
  });
  await page.goto(`/deposer/emploi?draft=${encodeURIComponent(draftId)}`);
  await expect(
    page.getByText("Formulaire indisponible", { exact: true }),
  ).toBeVisible();
  failCatalog = false;
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await page.getByRole("button", { name: /Reprendre/ }).click();
  const profession = page.getByRole("combobox", {
    name: "Métier",
    exact: true,
  });
  const specialization = page.getByRole("combobox", {
    name: "Spécialisation (facultatif)",
    exact: true,
  });
  await expect(profession).toHaveValue(
    "employment.fr.profession.frontend_engineer",
  );
  await expect(specialization).toHaveValue(
    "employment.fr.specialization.react",
  );
  await profession.selectOption("employment.fr.profession.data_analyst");
  await expect(specialization).toHaveValue("");
  await expect(
    specialization.locator(
      'option[value="employment.fr.specialization.react"]',
    ),
  ).toHaveCount(0);
  await specialization.selectOption(
    "employment.fr.specialization.business_intelligence",
  );
  await expect
    .poll(
      async () =>
        (await browserApi(page, `/employment/drafts/${draftId}`)).body.data,
    )
    .toMatchObject({
      professionId: "employment.fr.profession.data_analyst",
      specializationId: "employment.fr.specialization.business_intelligence",
    });
});

test("specialized details render the published localized characteristic values", async ({
  page,
}) => {
  await useEstablishedConsent(page);
  await usePersona(page, "guest");
  await page.goto("/auto");
  for (const item of [
    { api: "/auto/vehicles/vehicle_3008_petrol", route: "/auto/vehicule/" },
    {
      api: "/real-estate/properties/property_apartment_lyon",
      route: "/immo/bien/",
    },
  ]) {
    const response = await browserApi(page, item.api);
    expect(response.status).toBe(200);
    const fields = (
      response.body.taxonomy as {
        detailCharacteristics: Array<{
          labels: Record<string, string>;
          values: Record<string, string>;
        }>;
      }
    ).detailCharacteristics;
    expect(fields.length).toBeGreaterThan(3);
    await page.goto(`${item.route}${String(response.body.slug)}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      String(response.body.title),
    );
    for (const field of fields) {
      await expect(
        page.getByText(field.labels["fr-FR"], { exact: true }).first(),
      ).toBeVisible();
      await expect(
        page.getByText(field.values["fr-FR"], { exact: true }).first(),
      ).toBeVisible();
    }
  }
});

test("vehicle comparison recovers from API failure and uses published values", async ({
  page,
}) => {
  await useEstablishedConsent(page);
  await usePersona(page, "guest");
  await page.goto("/auto");
  const source = await browserApi(page, "/auto/vehicles/vehicle_3008_petrol");
  expect(source.status).toBe(200);
  let fail = true;
  await page.route("**/auto/vehicles/*", async (route) => {
    if (fail)
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Service unavailable",
          },
        }),
      });
    else await route.continue();
  });
  await page.goto("/auto/comparer?ids=vehicle_3008_petrol,vehicle_3008_diesel");
  await expect(
    page.getByText("Comparaison indisponible", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  const fields = (
    source.body.taxonomy as {
      detailCharacteristics: Array<{
        code: string;
        labels: Record<string, string>;
        values: Record<string, string>;
      }>;
    }
  ).detailCharacteristics;
  for (const field of fields.filter((value) => value.code !== "mileage")) {
    const row = table.getByRole("row").filter({
      has: page.getByRole("rowheader", {
        name: field.labels["fr-FR"],
        exact: true,
      }),
    });
    await expect(row).toContainText(field.values["fr-FR"]);
  }
});
