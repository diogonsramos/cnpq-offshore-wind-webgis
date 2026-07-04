/**
 * Testes de regressão — f01 (Fase 3): 4ª aba interna do Dashboard "GeoParquet Explorer".
 *
 * A aba fica sempre montada (alternância via CSS display), por isso os locators
 * compartilhados (.dv-input, .dv-filter-group, .dv-add-btn) são escopados a partir
 * do `.dv-tab-panel` correspondente para evitar violações de strict-mode do Playwright.
 *
 * Os valores padrão do painel (Modelo WRF, Experimento ERA5 Histórico) já apontam para
 * dados reais publicados em public/data/geoparquet/wrf/era5_atlas — por isso os testes
 * de contagem de pixels usam números exatos e determinísticos (30773 pixels no total,
 * 588 com state=BA), sem precisar trocar os seletores de Modelo/Experimento.
 */
import { test, expect } from '@playwright/test'

test.describe('Dashboard — GeoParquet Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await expect(page.locator('.dashboard-view')).toBeVisible()
    await page.click('.dv-inner-tab-btn:has-text("Explorador GeoParquet")')
  })

  const panel = (page: import('@playwright/test').Page) => page.locator('.dv-tab-panel').nth(3)

  test('T49 — aba aparece e o painel de filtros mostra todos os controles esperados', async ({ page }) => {
    await expect(page.locator('.dv-inner-tab-btn.active')).toHaveText('Explorador GeoParquet')

    const p = panel(page)
    await expect(p.locator('.dv-filter-group', { hasText: 'Modelo' }).locator('select')).toBeVisible()
    await expect(p.locator('.dv-filter-group', { hasText: 'Experimento' }).locator('select')).toBeVisible()
    await expect(p.locator('.dv-filter-group', { hasText: 'Variável' }).locator('select')).toBeVisible()
    await expect(p.locator('.dv-filter-group', { hasText: 'Altura' }).locator('select')).toBeVisible()
    await expect(p.locator('.gpe-checkbox-col', { hasText: 'Batimetria' }).locator('.dv-pair-checkbox')).toHaveCount(3)
    await expect(p.locator('.gpe-checkbox-col', { hasText: 'Estado' }).locator('.dv-pair-checkbox')).toHaveCount(17)
    await expect(p.locator('.gpe-range-pair input[type="range"]')).toHaveCount(2)
    await expect(p.locator('.dv-add-btn')).toHaveText('Aplicar Filtros')
    await expect(p.locator('.dv-empty')).toContainText('Ajuste os filtros')
  })

  test('T50 — Aplicar Filtros consulta dados reais (WRF ERA5 Histórico) e renderiza estatísticas e gráficos', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    const p = panel(page)
    await p.locator('.dv-add-btn').click()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('30773 pixels encontrados')

    await expect(p.locator('.gpe-stats-bar .gpe-stat-chip')).toHaveCount(6)
    await expect(p.locator('.chart-card')).toHaveCount(5)
    // Sem filtro de Estado/Batimetria ativo, os dois boxplots devem renderizar (não ficam ocultos).
    await expect(p.locator('.chart-card.chart-empty')).toHaveCount(0)

    expect(errors).toEqual([])
  })

  test('T51 — filtrar por Estado=BA reduz a contagem e oculta o boxplot por Estado', async ({ page }) => {
    const p = panel(page)
    await p.locator('.gpe-checkbox-col', { hasText: 'Estado' }).locator('.dv-pair-checkbox', { hasText: 'BA' }).locator('input').check()
    await p.locator('.dv-add-btn').click()

    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('588 pixels encontrados')
    await expect(p.locator('.chart-card.chart-empty')).toHaveCount(1)
    await expect(p.locator('.chart-card.chart-empty')).toContainText('desmarque o filtro de Estado')
  })

  test('T52 — trocar um filtro sem clicar em Aplicar Filtros não altera o resultado exibido', async ({ page }) => {
    const p = panel(page)
    await p.locator('.dv-add-btn').click()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('30773 pixels encontrados')

    await p.locator('.gpe-checkbox-col', { hasText: 'Estado' }).locator('.dv-pair-checkbox', { hasText: 'BA' }).locator('input').check()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('30773 pixels encontrados')

    await p.locator('.dv-add-btn').click()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('588 pixels encontrados')
  })

  test('T53 — alternar de aba e voltar preserva os filtros e o resultado aplicado', async ({ page }) => {
    const p = panel(page)
    await p.locator('.gpe-checkbox-col', { hasText: 'Estado' }).locator('.dv-pair-checkbox', { hasText: 'BA' }).locator('input').check()
    await p.locator('.dv-add-btn').click()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('588 pixels encontrados')

    await page.click('.dv-inner-tab-btn:has-text("Visão Simples")')
    await page.click('.dv-inner-tab-btn:has-text("Explorador GeoParquet")')

    await expect(p.locator('.gpe-checkbox-col', { hasText: 'Estado' }).locator('.dv-pair-checkbox', { hasText: 'BA' }).locator('input')).toBeChecked()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('588 pixels encontrados')
  })
})
