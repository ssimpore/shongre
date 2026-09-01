import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

const CONVERSATION_URL = "/compte/messages?convId=conv-02";

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
  await usePersona(page, "individual_seller");
});

test("message composer keeps touch targets and grows with multiline text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(CONVERSATION_URL, { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);

  const composer = page.locator("[data-message-composer]");
  const message = page.getByLabel("Votre message");
  const attach = page.getByRole("button", { name: "Joindre une photo" });
  const send = page.getByRole("button", { name: "Envoyer" });

  await expect(composer).toBeVisible();
  await expect(message).toBeVisible();
  await expect(send).toBeDisabled();

  for (const control of [attach, send]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  const initialHeight = (await message.boundingBox())!.height;
  await message.fill("Première ligne\nDeuxième ligne\nTroisième ligne");
  await expect(send).toBeEnabled();
  await expect
    .poll(async () => (await message.boundingBox())!.height)
    .toBeGreaterThan(initialHeight);
  expect((await message.boundingBox())!.height).toBeLessThanOrEqual(112);
});

test("message composer and photo picker fit a mobile conversation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(CONVERSATION_URL, { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);

  const composer = page.locator("[data-message-composer]");
  const attach = page.getByRole("button", { name: "Joindre une photo" });
  const send = page.getByRole("button", { name: "Envoyer" });

  await expect(composer).toBeVisible();
  await expectNoHorizontalOverflow(page, "mobile message composer");

  for (const control of [attach, send]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  await attach.click();
  await expect(
    page.getByText("Ajouter une photo à la conversation"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Fermer" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "mobile message attachment picker");
});

test("conversation context and composer remain contained at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(CONVERSATION_URL, { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);

  const context = page.locator("[data-conversation-context]");
  await expect(context).toBeVisible();
  await expect(page.locator("[data-message-composer]")).toBeVisible();
  const width = await context.evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
  await expectNoHorizontalOverflow(page, "320px conversation");
});
