/**
 * Testes de regressão — f06: i18n (pt-BR / English)
 *
 * Verifica o toggle de idioma no TabBar, a troca em tempo real de textos da
 * UI (landing page, SidePanel, FAQ), a persistência via localStorage e a
 * ausência de erros de console ao alternar idioma.
 */
import { test, expect } from '@playwright/test'

test.describe('Locale switcher — landing page', () => {
  test('T89 — toggle PT/EN aparece no TabBar com PT ativo por padrão', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-primary')
    await expect(page.locator('.tab-bar-locale')).toBeVisible()
    await expect(page.locator('.locale-btn', { hasText: 'PT' })).toHaveClass(/active/)
    await expect(page.locator('.locale-btn', { hasText: 'EN' })).not.toHaveClass(/active/)
  })

  test('T90 — clicar em EN traduz o H1 da landing page sem erro de console', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    await page.goto('/')
    await expect(page.locator('.lp-hero h1')).toContainText('Cenário atual e futuro do recurso eólico offshore no Brasil')

    await page.click('.lp-cta-primary')
    await page.click('.locale-btn:has-text("EN")')
    await page.click('.tab-home-btn')

    await expect(page.locator('.lp-hero h1')).toContainText('Current and future scenario of offshore wind resource in Brazil')
    expect(errors).toEqual([])
  })
})

test.describe('Locale switcher — SidePanel e persistência', () => {
  test('T91 — trocar para EN traduz os rótulos do SidePanel em tempo real', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-primary')

    await expect(page.locator('.select-field .label').first()).toContainText('Modelo')
    await page.click('.locale-btn:has-text("EN")')
    await expect(page.locator('.select-field .label').first()).toContainText('Model')
  })

  test('T92 — escolha de idioma persiste no localStorage após reload', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-primary')
    await page.click('.locale-btn:has-text("EN")')

    const stored = await page.evaluate(() => localStorage.getItem('cnpq-webgis-locale'))
    expect(stored).toBe('en')

    await page.reload()
    await page.click('.lp-cta-primary')
    await expect(page.locator('.locale-btn', { hasText: 'EN' })).toHaveClass(/active/)
    await expect(page.locator('.select-field .label').first()).toContainText('Model')
  })
})

test.describe('Locale switcher — FAQ', () => {
  test('T93 — FAQ do drawer exibe perguntas em inglês após trocar para EN', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-primary')
    await page.click('.locale-btn:has-text("EN")')

    await page.click('.footer-icon-btn[title="FAQ"]')
    await expect(page.locator('.drawer-header')).toContainText('FAQ — Frequently Asked Questions')
    await expect(page.locator('.faq-question').first()).toContainText('What are the WebGIS data sources?')
  })
})

// Regressão: datasetLabel()/varLabel()/modelLabel() (src/lib/cogCatalog.ts) eram
// funções puras independentes do Context de locale — trocar para EN não traduzia
// as opções de Experimento/Variável em nenhuma aba do Dashboard nem no SidePanel,
// mesmo com o resto da UI já em inglês. Corrigido passando `t` explicitamente
// para essas funções a partir de cada componente chamador.
test.describe('Locale switcher — rótulos de Experimento/Variável (cogCatalog)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await page.click('.locale-btn:has-text("EN")')
  })

  test('T94 — SidePanel (aba Mapa): Variável e rótulo do footer traduzidos', async ({ page }) => {
    await page.click('.tab-btn:has-text("WebGIS Map")')
    await expect(page.locator('.side-panel select').nth(1)).toContainText('Wind Speed')
    await expect(page.locator('.footer-info')).toContainText('ERA 5')
    await expect(page.locator('.footer-info')).not.toContainText('Reanálise')
  })

  test('T95 — Simple View: Experiment e Variable traduzidos', async ({ page }) => {
    const panel = page.locator('.dv-tab-panel').nth(0)
    await expect(panel.locator('.dv-filter-group', { hasText: 'Experiment' }).locator('select')).toContainText('ERA 5')
    await expect(panel.locator('.dv-filter-group', { hasText: 'Variable' }).locator('select')).toContainText('Wind Speed')
  })

  test('T96 — Compare Experiments: checkboxes de pares traduzidos', async ({ page }) => {
    await page.click('.dv-inner-tab-btn:has-text("Compare Experiments")')
    await expect(page.locator('.dv-pair-checkbox').first()).toContainText('ERA 5')
    await expect(page.locator('.dv-pair-checkbox').first()).not.toContainText('Reanálise')
  })

  test('T97 — Compare Models: chips WRF/MPAS traduzidos', async ({ page }) => {
    await page.click('.dv-inner-tab-btn:has-text("Compare Models")')
    const chips = page.locator('.dv-legend-chip')
    await expect(chips.nth(0)).toContainText('WRF — ERA 5')
    await expect(chips.nth(1)).toContainText('MPAS — ERA 5')
  })

  test('T98 — GeoParquet Explorer: Experiment e Variable traduzidos', async ({ page }) => {
    await page.click('.dv-inner-tab-btn:has-text("GeoParquet Explorer")')
    const panel = page.locator('.gpe')
    await expect(panel.locator('.dv-filter-group', { hasText: 'Experiment' }).locator('select')).toContainText('ERA 5')
    await expect(panel.locator('.dv-filter-group', { hasText: 'Variable' }).locator('select')).toContainText('Wind Speed')
  })
})

// Melhoria pós-entrega: o toggle PT/EN só existia no TabBar, que só é montado
// depois de entrar no sistema (tab !== 'home') — na landing page não havia
// como trocar de idioma antes de navegar. Extraído `LocaleToggle.tsx`
// (reaproveitado pelo TabBar) e adicionado também na navbar da LandingPage.
test.describe('Locale switcher — navbar da landing page', () => {
  test('T99 — toggle PT/EN na navbar da landing page traduz o H1 sem precisar entrar no sistema', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    await page.goto('/')
    await expect(page.locator('.lp-navbar-locale')).toBeVisible()
    await page.click('.lp-navbar-locale .locale-btn:has-text("EN")')

    await expect(page.locator('.lp-hero h1')).toContainText('Current and future scenario of offshore wind resource in Brazil')
    await expect(page.locator('.lp-navbar-enter')).toContainText('Enter System')
    expect(errors).toEqual([])
  })

  test('T100 — navbar da landing page não gera scroll horizontal em mobile (375px) com o toggle visível', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await expect(page.locator('.lp-navbar-locale')).toBeVisible()
    await expect(page.locator('.lp-navbar-enter')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
