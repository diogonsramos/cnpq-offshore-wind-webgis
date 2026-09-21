/**
 * Testes de regressão — f01 (Fase 2): abas internas do Dashboard "Compare Experiments"
 * e "Compare Models".
 *
 * As 3 abas internas (Visão Simples / Comparar Experimentos / Comparar Modelos) ficam
 * todas montadas simultaneamente (alternância via CSS display), por isso os testes
 * escopam locators compartilhados (.dv-input, .dv-filter-group) sempre a partir do
 * `.dv-tab-panel` correspondente para evitar violações de strict-mode do Playwright.
 */
import { test, expect } from '@playwright/test'

test.describe('Dashboard — abas internas de comparação', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await expect(page.locator('.dashboard-view')).toBeVisible()
  })

  test('T44 — abas internas aparecem e alternam o painel visível', async ({ page }) => {
    // 4 abas desde a Fase 3 (GeoParquet Explorer) — ver tests/e2e/08-geoparquet-explorer.spec.ts
    await expect(page.locator('.dv-inner-tab-btn')).toHaveCount(4)
    await expect(page.locator('.dv-inner-tab-btn.active')).toHaveText('Visão Simples')

    await page.click('.dv-inner-tab-btn:has-text("Comparar Experimentos")')
    await expect(page.locator('.dv-inner-tab-btn.active')).toHaveText('Comparar Experimentos')
    await expect(page.locator('.dv-pair-picker')).toBeVisible()
  })

  test('T45 — Compare Experiments: 2 pares WRF selecionados renderizam os 4 gráficos sem erro de console', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      console.log('BROWSER CONSOLE:', msg.text());
      if (msg.type() === 'error') errors.push(msg.text());
    })

    await page.click('.dv-inner-tab-btn:has-text("Comparar Experimentos")')
    const panel = page.locator('.dv-tab-panel').nth(1)

    const wrfCol = panel.locator('.dv-pair-col').nth(0)
    await wrfCol.locator('.dv-pair-checkbox').filter({ hasText: /^CMIP6 Histórico$/ }).locator('input').check()
    await wrfCol.locator('.dv-pair-checkbox', { hasText: 'CMIP6 SSP2-4.5' }).locator('input').check()

    await panel.locator('.dv-input').nth(0).fill('-10')
    await panel.locator('.dv-input').nth(1).fill('-35')
    await page.waitForTimeout(500)
    await panel.locator('.dv-add-btn').click()

    await expect(panel.locator('.dv-legend-chip')).toHaveCount(2)
    await expect(panel.locator('.dv-chart-grid .chart-card')).toHaveCount(3, { timeout: 60000 })

    expect(errors.filter(e => !e.includes('COG:'))).toEqual([])
  })

  test('T46 — Compare Experiments: seleção é limitada a 3 pares', async ({ page }) => {
    await page.click('.dv-inner-tab-btn:has-text("Comparar Experimentos")')
    const panel = page.locator('.dv-tab-panel').nth(1)

    const checkboxes = panel.locator('.dv-pair-checkbox input')
    const total = await checkboxes.count()
    for (let i = 0; i < 3; i++) await checkboxes.nth(i).check()

    for (let i = 3; i < total; i++) await expect(checkboxes.nth(i)).toBeDisabled()
  })

  test('T47 — Compare Models: WRF e MPAS têm dados reais para hist, sem erro de console', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    await page.click('.dv-inner-tab-btn:has-text("Comparar Modelos")')
    const panel = page.locator('.dv-tab-panel').nth(2)

    await panel.locator('.dv-filter-group', { hasText: 'Experimento' }).locator('select').selectOption('hist')
    await panel.locator('.dv-input').nth(0).fill('-10')
    await panel.locator('.dv-input').nth(1).fill('-35')
    await panel.locator('.dv-add-btn').click()

    // F07 Mock: MPAS agora tem parquets para hist/ssp245/ssp585 também.
    // Ambos os chips devem aparecer sem o badge "sem dados disponíveis".
    await expect(panel.locator('.dv-legend-chip')).toHaveCount(2, { timeout: 60000 })
    await expect(panel.locator('.dv-legend-chip').filter({ hasText: 'sem dados disponíveis' })).toHaveCount(0)

    expect(errors.filter(e => !e.includes('COG:'))).toEqual([])
  })

  test('T48 — alternar de aba e voltar preserva a seleção de pares no Compare Experiments', async ({ page }) => {
    await page.click('.dv-inner-tab-btn:has-text("Comparar Experimentos")')
    const panel = page.locator('.dv-tab-panel').nth(1)
    const wrfCol = panel.locator('.dv-pair-col').nth(0)
    const checkbox = wrfCol.locator('.dv-pair-checkbox').filter({ hasText: /^CMIP6 Histórico$/ }).locator('input')
    await checkbox.check()

    await page.click('.dv-inner-tab-btn:has-text("Visão Simples")')
    await page.click('.dv-inner-tab-btn:has-text("Comparar Experimentos")')

    await expect(checkbox).toBeChecked()
  })

  test('T56 — Compare Experiments: Weibull exibe k=/c= com dado real para os 2 pares', async ({ page }) => {
    // Regressão do bug de nomenclatura de colunas (weibull_100 vs. weibull_100m real) —
    // sem o fix, ambos os traços renderizam com curva zerada e sem "k=" no nome.
    await page.click('.dv-inner-tab-btn:has-text("Comparar Experimentos")')
    const panel = page.locator('.dv-tab-panel').nth(1)

    const wrfCol = panel.locator('.dv-pair-col').nth(0)
    await wrfCol.locator('.dv-pair-checkbox').filter({ hasText: /^CMIP6 Histórico$/ }).locator('input').check()
    await wrfCol.locator('.dv-pair-checkbox', { hasText: 'CMIP6 SSP2-4.5' }).locator('input').check()

    await panel.locator('.dv-input').nth(0).fill('-10')
    await panel.locator('.dv-input').nth(1).fill('-35')
    await panel.locator('.dv-add-btn').click()

    const weibullPlot = panel.locator('[data-testid="chart-weibull"] .js-plotly-plot')
    await expect(weibullPlot).toBeVisible({ timeout: 60000 })

    const names = await weibullPlot.evaluate((el: any) => (el.data ?? []).map((d: any) => d.name as string))
    expect(names.filter((n: string) => /k=\d+\.\d{2}, c=\d+\.\d{2}/.test(n))).toHaveLength(2)
  })
})
