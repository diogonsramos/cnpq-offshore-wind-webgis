import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Auditoria de Acessibilidade (Axe-core)', () => {
  test('Landing Page não deve ter violações críticas de acessibilidade', async ({ page }) => {
    await page.goto('/');
    
    // Aguarda carregar
    await expect(page.locator('.landing')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
