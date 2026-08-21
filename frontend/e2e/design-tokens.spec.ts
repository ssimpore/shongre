import { expect, test, type Locator, type Page } from '@playwright/test';
import { usePersona } from './personas';
import { expectNoHorizontalOverflow, waitForStableLayout } from './overflow';
import { ALL_ROUTES } from './routes';

const seedConsentDecision = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'shongre_cookie_consent_v1',
      JSON.stringify({
        version: 1,
        decidedAt: new Date().toISOString(),
        categories: { necessary: true, analytics: false, marketing: false },
      }),
    );
  });
};

test.describe('design-token runtime contracts', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1408, height: 749 });
    await usePersona(page, 'guest');
    await seedConsentDecision(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForStableLayout(page);
  });

  test('loads the current token sheet and keeps listing rails compact', async ({ page }) => {
    const contract = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const cells = [...document.querySelectorAll<HTMLElement>('.w-listing-card')];
      const widths = cells.slice(0, 6).map((cell) => cell.getBoundingClientRect().width);

      return {
        version: root.getPropertyValue('--design-system-contract-version').trim(),
        tokenWidth: root.getPropertyValue('--spacing-listing-card').trim(),
        widths,
      };
    });

    expect(contract.version).toBe('4');
    expect(contract.tokenWidth).toBe('11.75rem');
    expect(contract.widths.length, 'the recent-listings rail did not render').toBeGreaterThanOrEqual(6);
    for (const width of contract.widths) {
      expect(width).toBeCloseTo(188, 0);
    }
  });

  test('resolves the representative color, type, size, radius, elevation and motion tokens', async ({ page }) => {
    const styles = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.className =
        'fixed bg-primary text-white text-3xl h-control-md max-w-page rounded-control shadow-dropdown transition-all duration-normal';
      probe.textContent = 'Design token probe';
      document.body.appendChild(probe);

      const computed = getComputedStyle(probe);
      const result = {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontSize: computed.fontSize,
        height: computed.height,
        maxWidth: computed.maxWidth,
        borderRadius: computed.borderRadius,
        boxShadow: computed.boxShadow,
        transitionDuration: computed.transitionDuration,
      };
      probe.remove();
      return result;
    });

    expect(styles).toMatchObject({
      backgroundColor: 'rgb(196, 67, 31)',
      color: 'rgb(255, 255, 255)',
      fontSize: '30px',
      height: '40px',
      maxWidth: '1280px',
      borderRadius: '10px',
      transitionDuration: '0.25s',
    });
    expect(styles.boxShadow).not.toBe('none');
  });

  test('resolves the complete control scale with one shared radius', async ({ page }) => {
    const controls = await page.evaluate(() => {
      const sizes = ['sm', 'md', 'touch', 'lg'] as const;
      const probes = sizes.map((size) => {
        const probe = document.createElement('button');
        probe.className = `h-control-${size} rounded-control`;
        document.body.appendChild(probe);
        const computed = getComputedStyle(probe);
        const result = {
          size,
          height: computed.height,
          radius: computed.borderRadius,
        };
        probe.remove();
        return result;
      });
      return probes;
    });

    expect(controls).toEqual([
      { size: 'sm', height: '32px', radius: '10px' },
      { size: 'md', height: '40px', radius: '10px' },
      { size: 'touch', height: '44px', radius: '10px' },
      { size: 'lg', height: '48px', radius: '10px' },
    ]);
  });

  test('loads the bundled UI font with a stable fallback contract', async ({ page }) => {
    const font = await page.evaluate(async () => {
      await document.fonts.ready;
      const body = getComputedStyle(document.body);
      return {
        family: body.fontFamily,
        synthesis: body.fontSynthesis,
        loaded: document.fonts.check('16px "Inter Variable"'),
      };
    });

    expect(font.family).toContain('Inter Variable');
    expect(font.synthesis).toBe('none');
    expect(font.loaded).toBe(true);
  });

  test('keeps every routed surface on token-backed typography', async ({ page }) => {
    // This is deliberately a route-wide audit (public, account, Pro, admin
    // and CRM), so it needs more time than a single-surface contract while
    // remaining bounded in CI.
    test.setTimeout(240_000);
    for (const route of ALL_ROUTES) {
      await usePersona(page, route.persona);
      await page.goto(route.path, { waitUntil: 'networkidle' });
      await waitForStableLayout(page);

      const audit = await page.evaluate(() => {
        const arbitraryTypography = [...document.querySelectorAll<HTMLElement>('[class]')]
          .flatMap((element) => String(element.className).split(/\s+/))
          .filter((className) => /^(?:[a-z-]+:)*(?:text|leading|tracking|font)-\[[^\]]+\]$/.test(className));
        const inlineTypography = [...document.querySelectorAll<HTMLElement>('[style]')]
          .filter((element) => /(?:font-family|font-size|font-weight|line-height|letter-spacing)/i.test(element.getAttribute('style') || ''))
          .map((element) => element.outerHTML.slice(0, 180));
        const body = getComputedStyle(document.body);
        return {
          arbitraryTypography,
          inlineTypography,
          bodyFontFamily: body.fontFamily,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });

      expect(audit.arbitraryTypography, `${route.name} contains arbitrary typography`).toEqual([]);
      expect(audit.inlineTypography, `${route.name} contains inline typography`).toEqual([]);
      expect(audit.bodyFontFamily, `${route.name} lost the bundled UI font`).toContain('Inter Variable');
      expect(audit.overflow, `${route.name} overflows horizontally`).toBe(false);
    }
  });

  test('keeps native registration fields on the touch size and control radius', async ({ page }) => {
    await page.goto('/inscription/particulier', { waitUntil: 'networkidle' });
    await waitForStableLayout(page);

    const fields = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        'main input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="hidden"]), main select',
      )]
        .filter((field) => field.getBoundingClientRect().height > 0)
        .map((field) => {
          const rect = field.getBoundingClientRect();
          const computed = getComputedStyle(field);
          return { height: Math.round(rect.height), radius: computed.borderRadius };
        }),
    );

    expect(fields.length).toBeGreaterThanOrEqual(6);
    expect(new Set(fields.map((field) => field.height))).toEqual(new Set([44]));
    expect(new Set(fields.map((field) => field.radius))).toEqual(new Set(['10px']));
  });

  test('harmonizes primary authentication actions on the touch control metric', async ({ page }) => {
    const paths = [
      '/connexion',
      '/inscription',
      '/inscription/particulier',
      '/inscription/professionnel',
      '/mot-de-passe-oublie',
      '/reinitialisation-mot-de-passe?token=demo-reset-token',
      '/verification-email',
    ];

    for (const path of paths) {
      await page.goto(path, { waitUntil: 'networkidle' });
      await waitForStableLayout(page);

      const action = page.locator('main button.h-control-touch').first();
      await expect(action, `missing auth action on ${path}`).toBeVisible();

      const metric = await action.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        return { height: Math.round(rect.height), radius: computed.borderRadius };
      });

      expect(metric, path).toEqual({ height: 44, radius: '10px' });
    }
  });

  test('keeps authentication actions compact and contained on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const path of ['/connexion', '/inscription', '/inscription/professionnel']) {
      await page.goto(path, { waitUntil: 'networkidle' });
      await waitForStableLayout(page);

      const action = page.locator('main button.h-control-touch').first();
      await expect(action, `missing mobile auth action on ${path}`).toBeVisible();
      await expectNoHorizontalOverflow(page, `mobile auth route ${path}`);

      const metric = await action.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        return { height: Math.round(rect.height), radius: computed.borderRadius };
      });
      expect(metric, path).toEqual({ height: 44, radius: '10px' });
    }
  });

  test('aligns the desktop header action row on the compact control metric', async ({ page }) => {
    await usePersona(page, 'individual_buyer');
    await page.reload({ waitUntil: 'networkidle' });

    const actions = await page.evaluate(() => {
      const candidates = [
        document.querySelector('#header-desktop-lang-button'),
        document.querySelector('header a[aria-label="Favoris"]'),
        document.querySelector('header a[aria-label="Messagerie"]'),
        document.querySelector('header button[aria-label^="Notifications"]'),
        document.querySelector('header button[aria-label^="Menu du compte"]'),
      ].filter((node): node is HTMLElement => node instanceof HTMLElement);

      return candidates.map((action) => {
        const rect = action.getBoundingClientRect();
        const computed = getComputedStyle(action);
        return { height: Math.round(rect.height), radius: computed.borderRadius };
      });
    });

    expect(actions).toHaveLength(5);
    expect(new Set(actions.map((action) => action.height))).toEqual(new Set([40]));
    expect(new Set(actions.map((action) => action.radius))).toEqual(new Set(['10px']));
  });

  test('keeps the category navigation compact at every viewport', async ({ page }) => {
    const categoryNav = page.locator('header nav[aria-label="Filtres par catégorie"]');
    const categoryLink = categoryNav.getByRole('link', { name: 'Immobilier', exact: true });

    await expect(categoryLink).toBeVisible();

    const readMetric = () =>
      categoryLink.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        return { height: Math.round(rect.height), radius: computed.borderRadius };
      });

    expect(await readMetric()).toEqual({ height: 40, radius: '10px' });

    await page.setViewportSize({ width: 390, height: 844 });
    await waitForStableLayout(page);
    await expect(categoryLink).toBeVisible();
    expect(await readMetric()).toEqual({ height: 40, radius: '10px' });
    await expectNoHorizontalOverflow(page, 'mobile category navigation');
  });

  test('aligns homepage hero actions with the Pro discovery control', async ({ page }) => {
    const readMetric = async (locator: Locator) =>
      locator.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        return { height: Math.round(rect.height), radius: computed.borderRadius };
      });

    const main = page.getByRole('main');
    const heroPublish = main.getByRole('link', { name: 'Déposer une annonce', exact: true });
    const heroExplore = main.getByRole('link', { name: 'Explorer le catalogue', exact: true });
    const proDiscovery = main.getByRole('link', { name: 'Découvrir les forfaits Pro', exact: true });

    await expect(heroPublish).toBeVisible();
    await expect(heroExplore).toBeVisible();
    await expect(proDiscovery).toBeVisible();

    expect(await readMetric(proDiscovery)).toEqual({ height: 44, radius: '10px' });
    expect(await readMetric(heroPublish)).toEqual({ height: 44, radius: '10px' });
    expect(await readMetric(heroExplore)).toEqual({ height: 44, radius: '10px' });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(heroPublish).toBeVisible();
    await expect(heroExplore).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile homepage hero actions');
    expect(await readMetric(heroPublish)).toEqual({ height: 44, radius: '10px' });
    expect(await readMetric(heroExplore)).toEqual({ height: 44, radius: '10px' });
  });

  test('aligns footer newsletter controls with the Pro discovery control', async ({ page }) => {
    const readMetric = async (locator: Locator) =>
      locator.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        return { height: Math.round(rect.height), radius: computed.borderRadius };
      });

    const main = page.getByRole('main');
    const proDiscovery = main.getByRole('link', { name: 'Découvrir les forfaits Pro', exact: true });
    const newsletter = page.getByRole('complementary', { name: 'Newsletter Shongre' });
    const email = newsletter.getByRole('textbox', { name: /adresse email/i });
    const submit = newsletter.getByRole('button', { name: "S'inscrire", exact: true });

    await expect(email).toBeVisible();
    await expect(submit).toBeVisible();
    expect(await readMetric(proDiscovery)).toEqual({ height: 44, radius: '10px' });
    expect(await readMetric(email)).toEqual({ height: 44, radius: '10px' });
    expect(await readMetric(submit)).toEqual({ height: 44, radius: '10px' });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(email).toBeVisible();
    await expect(submit).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile footer newsletter controls');
    expect(await readMetric(email)).toEqual({ height: 44, radius: '10px' });
    expect(await readMetric(submit)).toEqual({ height: 44, radius: '10px' });
  });

  test('aligns listing transaction actions with the shared touch control metric', async ({ page }) => {
    const readMetric = async (locator: Locator) =>
      locator.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        return { height: Math.round(rect.height), radius: computed.borderRadius };
      });

    await page.goto('/annonce/list-108', { waitUntil: 'networkidle' });
    await waitForStableLayout(page);

    const desktopActions = page.getByTestId('listing-desktop-actions').getByRole('button');
    await expect(desktopActions.first()).toBeVisible();
    expect(await desktopActions.count()).toBeGreaterThanOrEqual(2);
    for (const action of await desktopActions.all()) {
      expect(await readMetric(action)).toEqual({ height: 44, radius: '10px' });
    }

    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await waitForStableLayout(page);

      const mobileActions = page.getByTestId('listing-mobile-actions').getByRole('button');
      await expect(mobileActions.first(), `missing listing actions at ${width}px`).toBeVisible();
      expect(await mobileActions.count()).toBeGreaterThanOrEqual(2);
      for (const action of await mobileActions.all()) {
        expect(await readMetric(action), `${width}px`).toEqual({ height: 44, radius: '10px' });
      }
      await expectNoHorizontalOverflow(page, `listing transaction actions at ${width}px`);
    }
  });

  test('keeps scrolled content underneath the sticky header', async ({ page }) => {
    const recentCard = page.getByRole('link', { name: /Antiquités/i });
    await expect(recentCard).toBeVisible();

    const result = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('body > div header');
      const cardLink = [...document.querySelectorAll<HTMLAnchorElement>('a')].find((link) =>
        /Antiquités/i.test(link.textContent || ''),
      );
      if (!header || !cardLink) return null;

      const initial = cardLink.getBoundingClientRect();
      const headerHeight = header.getBoundingClientRect().height;
      window.scrollTo(0, window.scrollY + initial.top - headerHeight / 2);

      const headerRect = header.getBoundingClientRect();
      const x = Math.min(window.innerWidth - 1, Math.max(1, initial.left + 12));
      const y = Math.max(1, headerRect.bottom - 12);
      const topmost = document.elementFromPoint(x, y);

      return {
        headerPosition: getComputedStyle(header).position,
        headerZIndex: getComputedStyle(header).zIndex,
        topmostIsHeader: Boolean(topmost && header.contains(topmost)),
      };
    });

    expect(result).not.toBeNull();
    expect(result!.headerPosition).toBe('sticky');
    expect(Number(result!.headerZIndex)).toBe(40);
    expect(result!.topmostIsHeader).toBe(true);
  });
});
