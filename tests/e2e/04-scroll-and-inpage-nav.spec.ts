/**
 * Testes de regressão — Fase 2 (TOFIX): Scroll e navegação in-page
 *
 * Verifica que o scroll vertical funciona na landing page, que o menu de
 * navegação por âncoras está presente, que as seções têm IDs corretos e
 * que o botão "Voltar ao topo" aparece após scroll.
 */
import { test, expect } from '@playwright/test'

test.describe('Scroll vertical na landing page', () => {
  test('T20 — página rola verticalmente (window.scrollY aumenta após scroll)', async ({ page }) => {
    await page.goto('/')
    const initialY = await page.evaluate(() => window.scrollY)
    expect(initialY).toBe(0)

    await page.evaluate(() => window.scrollBy(0, 600))
    const afterY = await page.evaluate(() => window.scrollY)
    expect(afterY).toBeGreaterThan(0)
  })

  test('T21 — página tem altura maior que a viewport (conteúdo rolável existe)', async ({ page }) => {
    await page.goto('/')
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight)
    expect(scrollHeight).toBeGreaterThan(clientHeight)
  })
})

test.describe('Navegação in-page — links de âncora no navbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('T22 — navbar contém links para seções principais', async ({ page }) => {
    const anchors = page.locator('.lp-nav-anchor')
    await expect(anchors).toHaveCount(5)
    await expect(anchors.filter({ hasText: 'Metodologia' })).toBeVisible()
    await expect(anchors.filter({ hasText: 'Cenários' })).toBeVisible()
    await expect(anchors.filter({ hasText: 'Equipe' })).toBeVisible()
    await expect(anchors.filter({ hasText: 'Publicações' })).toBeVisible()
  })

  test('T23 — seções principais possuem IDs de âncora', async ({ page }) => {
    for (const id of ['metodologia', 'cenarios', 'interface', 'equipe', 'publicacoes']) {
      const el = page.locator(`#${id}`)
      await expect(el).toHaveCount(1)
    }
  })
})

test.describe('Botão "Voltar ao topo"', () => {
  test('T24 — botão não é visível no carregamento inicial', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.lp-back-to-top')).not.toBeVisible()
  })

  test('T25 — botão aparece após rolar a página', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.scrollBy(0, 800))
    await expect(page.locator('.lp-back-to-top')).toBeVisible()
  })
})
