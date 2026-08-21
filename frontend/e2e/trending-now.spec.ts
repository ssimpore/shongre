import { test, expect } from '@playwright/test';
import { usePersona } from './personas';
import { expectNoHorizontalOverflow, waitForStableLayout } from './overflow';

test.describe('En ce moment sur Shongre', () => {
  test('renders every configured topic as its own subsection', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    const section = page.getByRole('region', { name: 'En ce moment sur Shongre' });
    await expect(section).toBeVisible();

    await expect(section.getByRole('tablist')).toHaveCount(0);
    const topicSections = section.locator('[data-topic-id]');
    await expect(topicSections).toHaveCount(8);
    await expect(section.locator('h3[id^="trending-topic-heading-"]')).toHaveCount(8);
    await expect(topicSections.first().getByRole('link', { name: /Voir tout/ })).toBeVisible();

    await topicSections.first().getByRole('link', { name: /Voir tout/ }).click();
    await expect(page).toHaveURL(/\/categorie\//);
  });

  test('keeps stacked topic subsections usable on mobile without page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await usePersona(page, 'guest');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    const section = page.getByRole('region', { name: 'En ce moment sur Shongre' });
    const topicSections = section.locator('[data-topic-id]');
    await expect(topicSections).toHaveCount(8);
    await expect(section.getByRole('tab')).toHaveCount(0);
    await expect(topicSections.first().locator('h3[id^="trending-topic-heading-"]')).toBeVisible();
    const pageOverflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );

    expect(pageOverflows).toBe(false);
  });

  test('lets an administrator control the number of homepage subsections', async ({ page }) => {
    await usePersona(page, 'admin');
    await page.goto('/admin/tendances', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    const maxTopics = page.getByLabel('Maximum de sous-sections');
    await expect(maxTopics).toHaveValue('8');
    await maxTopics.fill('5');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('5 sous-sections affichées', { exact: true })).toBeVisible();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);
    await expect(page.getByRole('region', { name: 'En ce moment sur Shongre' }).locator('[data-topic-id]')).toHaveCount(5);
  });

  test('lets an administrator pin and hide a topic from the preview', async ({ page }) => {
    await usePersona(page, 'admin');
    await page.goto('/admin/tendances', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    await expect(page.getByRole('heading', { name: 'En ce moment sur Shongre' })).toBeVisible();
    const pinButton = page.getByRole('button', { name: /^Épingler / }).first();
    const firstRow = pinButton.locator('..');
    await expect(firstRow).toBeVisible();

    const topicName = await firstRow.locator('div').first().locator('div').first().innerText();
    await pinButton.click();
    await expect(page.getByText('Épinglé', { exact: true })).toBeVisible();

    const currentRow = page.getByText(topicName, { exact: true }).locator('..').locator('..');
    await currentRow.getByRole('button', { name: /Masquer/ }).click();
    await expect(page.getByText(topicName, { exact: true })).toHaveCount(0);
  });

  test('keeps editorial collections after the deals section', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    const dealsHeading = page.getByRole('heading', { name: 'Meilleures offres', exact: true });
    const trendingSection = page.getByRole('region', { name: 'En ce moment sur Shongre' });
    const collectionsHeading = page.getByRole('heading', { name: 'Tendance en ce moment', exact: true });
    await expect(dealsHeading).toBeVisible();
    await expect(trendingSection).toBeVisible();
    await expect(collectionsHeading).toBeVisible();

    const order = await dealsHeading.evaluate((deals, nodes) => {
      const [trending, collections] = nodes as [HTMLElement | null, HTMLElement | null];
      return {
        trendingAfterDeals: Boolean(trending && (deals.compareDocumentPosition(trending) & Node.DOCUMENT_POSITION_FOLLOWING)),
        collectionsAfterTrending: Boolean(trending && collections && (trending.compareDocumentPosition(collections) & Node.DOCUMENT_POSITION_FOLLOWING)),
      };
    }, [await trendingSection.elementHandle(), await collectionsHeading.elementHandle()]);

    expect(order).toEqual({ trendingAfterDeals: true, collectionsAfterTrending: true });
  });

  test('keeps collection cards linked and replaces failed artwork with a visible fallback', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    const section = page.getByRole('region', { name: 'Tendance en ce moment' });
    const cards = section.locator('[data-collection-id]');
    await expect(cards).toHaveCount(5);
    await expect(section.locator('[data-collection-artwork]')).toHaveCount(5);

    const cardLinks = await cards.evaluateAll((elements) => elements.map((element) => (element as HTMLAnchorElement).getAttribute('href')));
    expect(cardLinks).toEqual([
      '/recherche?q=jante+roue+piece+auto',
      '/recherche?category=velos',
      '/recherche?category=maison-deco',
      '/recherche?q=piscine+bouee+ete',
      '/recherche?q=ventilateur+climatiseur',
    ]);

    const brokenImages = await section.locator('img').evaluateAll((images) =>
      images.filter((image): image is HTMLImageElement => image instanceof HTMLImageElement && image.complete && image.naturalWidth === 0).length,
    );
    expect(brokenImages).toBe(0);
    await cards.nth(2).click();
    await expect(page).toHaveURL('/recherche?category=maison-deco');
  });

  test('keeps the collection rail usable on mobile without page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await usePersona(page, 'guest');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    const section = page.getByRole('region', { name: 'Tendance en ce moment' });
    const rail = section.locator('[role="region"]').first();
    await expect(rail).toBeVisible();
    await expect(section.locator('[data-collection-id]')).toHaveCount(5);

    const railMetrics = await rail.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
    expect(railMetrics.scrollWidth).toBeGreaterThan(railMetrics.clientWidth);
    await expectNoHorizontalOverflow(page, 'collections mobile rail');
  });
});
