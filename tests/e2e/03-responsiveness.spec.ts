/**
 * Testes de regressão — Fase 1: Responsividade da Landing Page
 *
 * Verifica que a landing page não causa scroll horizontal e adapta
 * o layout corretamente nos breakpoints definidos (768 px e 480 px).
 */
import { test, expect } from '@playwright/test'

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
]

for (const vp of VIEWPORTS) {
  test(`T08 — sem scroll horizontal em ${vp.name} (${vp.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
}

test('T08b — em mobile (375 px) os CTAs são exibidos em coluna', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  const primary = await page.locator('.lp-cta-primary').boundingBox()
  const secondary = await page.locator('.lp-cta-secondary').boundingBox()
  // Em coluna, o CTA secundário deve estar abaixo do primário
  expect(secondary!.y).toBeGreaterThan(primary!.y + primary!.height - 10)
})
