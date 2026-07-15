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

for (const vp of VIEWPORTS) {
  test(`T60 — Dashboard sem scroll horizontal em ${vp.name} (${vp.width}px), em todas as 4 abas`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await expect(page.locator('.dashboard-view')).toBeVisible()

    for (const tabName of ['Visão Simples', 'Comparar Experimentos', 'Comparar Modelos', 'Explorador GeoParquet']) {
      await page.click(`.dv-inner-tab-btn:has-text("${tabName}")`)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `overflow em "${tabName}"`).toBeLessThanOrEqual(1)
    }
  })
}

test('T61 — Visão Simples: filtros e "+ Add Location" não ficam espremidos em mobile/tablet (regressão)', async ({ page }) => {
  // Regressão: .dv-sidebar (mini-mapa) ganha width:100% em ≤900px, mas só
  // .dv-main (usado por Comparar Experimentos/Modelos) also virava column nesse
  // breakpoint — .dv-tab-panel (usado pela Visão Simples) ficava row, então o
  // mini-mapa (100% de largura) espremia .dv-body para uma fatia de ~30px.
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await page.click('.lp-cta-secondary')
  await expect(page.locator('.dashboard-view')).toBeVisible()

  const addBtn = await page.locator('.dv-tab-panel').nth(0).locator('.dv-add-btn').boundingBox()
  expect(addBtn!.width).toBeGreaterThan(80)
})
