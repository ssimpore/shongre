import { expect, test } from '@playwright/test';
import { usePersona } from './personas';
import { expectNoHorizontalOverflow, waitForStableLayout } from './overflow';

test.describe('listing mobile action hierarchy', () => {
  test('keeps secondary actions balanced and gives a three-action primary CTA a full row', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.setViewportSize({ width: 444, height: 795 });
    await page.goto('/annonce/list-112', { waitUntil: 'networkidle' });
    await waitForStableLayout(page);

    const actions = page.getByTestId('listing-mobile-actions');
    await expect(actions).toBeVisible();
    await expect(actions.getByRole('button')).toHaveCount(3);

    const layout = await actions.evaluate((container) => {
      const buttons = [...container.querySelectorAll<HTMLButtonElement>('button')];
      const containerRect = container.getBoundingClientRect();
      return {
        containerWidth: containerRect.width,
        buttons: buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return { top: Math.round(rect.top), width: rect.width };
        }),
      };
    });

    expect(layout.buttons[0].top).toBe(layout.buttons[1].top);
    expect(layout.buttons[2].top).toBeGreaterThan(layout.buttons[0].top);
    expect(layout.buttons[2].width).toBeGreaterThanOrEqual(layout.containerWidth - 2);
    await expectNoHorizontalOverflow(page, 'listing mobile action hierarchy at 444px');
  });

  test('keeps the action hierarchy contained at the minimum supported width', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('/annonce/list-112', { waitUntil: 'networkidle' });
    await waitForStableLayout(page);

    const actions = page.getByTestId('listing-mobile-actions');
    const layout = await actions.evaluate((container) => {
      const buttons = [...container.querySelectorAll<HTMLButtonElement>('button')];
      const containerRect = container.getBoundingClientRect();
      const primaryRect = buttons.at(-1)?.getBoundingClientRect();
      return {
        containerWidth: containerRect.width,
        primaryWidth: primaryRect?.width ?? 0,
      };
    });

    expect(layout.primaryWidth).toBeGreaterThanOrEqual(layout.containerWidth - 2);
    await expectNoHorizontalOverflow(page, 'listing mobile action hierarchy at 320px');
  });

  test('keeps four-action layouts in two balanced rows', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.setViewportSize({ width: 444, height: 844 });
    await page.goto('/annonce/list-109', { waitUntil: 'networkidle' });
    await waitForStableLayout(page);

    const actions = page.getByTestId('listing-mobile-actions');
    await expect(actions.getByRole('button')).toHaveCount(4);

    const layout = await actions.evaluate((container) => {
      const buttons = [...container.querySelectorAll<HTMLButtonElement>('button')];
      const containerWidth = container.getBoundingClientRect().width;
      return {
        containerWidth,
        buttons: buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return { top: Math.round(rect.top), width: rect.width };
        }),
      };
    });

    expect(layout.buttons[0].top).toBe(layout.buttons[1].top);
    expect(layout.buttons[2].top).toBe(layout.buttons[3].top);
    expect(layout.buttons[2].width).toBe(layout.buttons[0].width);
    expect(layout.buttons[3].width).toBe(layout.buttons[1].width);
    expect(layout.buttons[2].top).toBeGreaterThan(layout.buttons[0].top);
    await expectNoHorizontalOverflow(page, 'four-action mobile hierarchy at 444px');
  });
});
