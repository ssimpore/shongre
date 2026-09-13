import { test } from "@playwright/test";
import { waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

test("captures the completed footer", async ({ page }) => {
  await useEstablishedConsent(page);
  await usePersona(page, "guest");

  for (const viewport of [
    { width: 1776, height: 887, path: "/tmp/shongre-footer-final-desktop.png" },
    { width: 1408, height: 900, path: "/tmp/shongre-footer-final-current.png" },
    { width: 390, height: 844, path: "/tmp/shongre-footer-final-mobile.png" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    await page.locator("footer").screenshot({
      path: viewport.path,
      animations: "disabled",
    });
  }
});
