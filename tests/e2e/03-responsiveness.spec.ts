import { test, expect } from '@playwright/test'

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
]

for (const vp of VIEWPORTS) {
  test(`T08 — sem scroll horizontal em ${vp.name} (${vp.width}px) na Landing Page`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
}

test('T08b — em mobile (375 px) os CTAs da Landing Page são exibidos em coluna', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  const primary = await page.locator('.lp-cta-primary').boundingBox()
  const secondary = await page.locator('.lp-cta-secondary').boundingBox()
  expect(secondary!.y).toBeGreaterThan(primary!.y + primary!.height - 10)
})

for (const vp of VIEWPORTS) {
  test(`T60 — Dashboard Unificado sem scroll horizontal overflow absurdo em ${vp.name} (${vp.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await expect(page.locator('.dashboard-view')).toBeVisible()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, `overflow em dashboard`).toBeLessThanOrEqual(1)
  })
}
