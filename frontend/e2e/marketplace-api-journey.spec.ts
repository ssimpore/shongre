import { expect, test } from "@playwright/test";
import { browserApi } from "./browser-api";
import { useEstablishedConsent, usePersona } from "./personas";
import { testListingId } from "./fixtures";

test("published inventory, buyer favourites and messages survive reload through the API", async ({
  page,
}, testInfo) => {
  // Three independently authenticated accounts and persisted reloads form one journey.
  test.setTimeout(90_000);
  await useEstablishedConsent(page);
  await usePersona(page, "individual_seller");
  const source = await browserApi(
    page,
    `/listings/${testListingId("list-117")}`,
  );
  expect(source.status).toBe(200);
  expect(source.body.sellerId).toBe("user_camille");
  expect(
    Array.isArray(source.body.images) && source.body.images.length > 0,
  ).toBe(true);
  const title = `Smartphone Sony Xperia — parcours ${testInfo.project.name}`;
  const publication = await browserApi(page, "/listings/publish", {
    method: "POST",
    body: {
      draft: {
        title,
        description:
          "Excellent état, vendu avec sa boîte et deux coques de protection.",
        price: 1850,
        categoryId: "electronics.smartphones.phones",
        marketCode: "FR",
        listingTypeId: "electronics.smartphones.phones.listing",
        intent: "SELL",
        taxonomyVersion: "v1",
        taxonomyRevision: 1,
        sellerType: "individual",
        condition: "tres-bon-etat",
        // Reuse the seller's backend-owned test media; hosted storage is certified separately.
        images: source.body.images,
        fulfillmentTypes: ["PHYSICAL"],
        city: "Lyon",
        postalCode: "69002",
        attributes: { listing_intent: "sell" },
      },
    },
  });
  expect(publication.status, JSON.stringify(publication.body)).toBe(200);
  expect(publication.body.sellerId).toBe("user_camille");
  expect(publication.body.status).toBe("published");
  const listingId = String(publication.body.id);
  expect(listingId).not.toBe("undefined");
  await page.goto("/healthz");
  expect(
    (await browserApi(page, "/auth/logout", { method: "POST", body: {} }))
      .status,
  ).toBe(200);

  await usePersona(page, "individual_buyer");
  await page.goto(`/annonce/${encodeURIComponent(listingId)}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  const favourite = page
    .getByRole("button", { name: /ajouter aux favoris/i })
    .first();
  await favourite.click();
  await expect
    .poll(async () => (await browserApi(page, "/favorites")).body.listingIds)
    .toContain(listingId);
  await page.reload();
  await expect(
    page.getByRole("button", { name: /retirer des favoris/i }).first(),
  ).toBeVisible({ timeout: 30_000 });

  const conversation = await browserApi(page, "/messaging/conversations", {
    method: "POST",
    body: {
      listingId,
      initialMessage: "Bonjour, cet article est-il toujours disponible ?",
    },
  });
  expect(conversation.status).toBe(200);
  const conversationId = String(conversation.body.id);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    `/compte/messages?convId=${encodeURIComponent(conversationId)}`,
  );
  const composer = page.getByRole("textbox", {
    name: "Votre message",
    exact: true,
  });
  await expect(composer).toBeVisible();
  const bounds = await composer.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  const message = `Je souhaite organiser une remise en main propre — ${testInfo.project.name}.`;
  await composer.fill(message);
  const sent = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        `/api/v1/messaging/conversations/${conversationId}/messages` &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  expect((await sent).status()).toBe(200);
  await page.reload();
  await expect(
    page
      .getByLabel("Historique de la conversation", { exact: true })
      .getByText(message, { exact: true }),
  ).toBeVisible();
  await page.goto("/healthz");
  await browserApi(page, "/auth/logout", { method: "POST", body: {} });
  await usePersona(page, "pro_seller");
  expect((await browserApi(page, "/favorites")).body.listingIds).not.toContain(
    listingId,
  );
  expect([403, 404]).toContain(
    (
      await browserApi(
        page,
        `/messaging/conversations/${conversationId}/messages`,
      )
    ).status,
  );
});
