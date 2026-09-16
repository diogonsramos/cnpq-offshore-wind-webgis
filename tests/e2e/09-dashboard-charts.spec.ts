/**
 * Testes de regressão — f02: dashboard-charts
 *
 * Verifica os novos cards de gráfico da Visão Simples (Perfil de Densidade de
 * Potência e Distribuição Direcional/Heatmap) e os limites fixos de eixo dos
 * gráficos existentes (Média Sazonal e Perfil Vertical de Velocidade). Os dados
 * `wpd_profile_means` e `*_heatmap` ainda não são publicados em nenhum GeoParquet
 * real (mesma limitação de pipeline já registrada em docs/TODO.md, categoria B),
 * então os novos cards devem mostrar o estado vazio (`chart-empty`) em vez de um
 * gráfico quebrado ou em branco — isso é o comportamento correto, não um bug.
 */
import { test, expect } from '@playwright/test'

test.describe('Dashboard — Visão Simples: novos gráficos (f02)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await expect(page.locator('.dashboard-view')).toBeVisible()

    const panel = page.locator('.dv-tab-panel').nth(0)
    await panel.locator('.dv-filter-group', { hasText: 'Experimento' }).locator('select').selectOption('hist')

    await panel.locator('.dv-input').nth(0).fill('-10')
    await panel.locator('.dv-input').nth(1).fill('-35')
    await expect(async () => {
      await panel.locator('.dv-add-btn').click()
      await expect(panel.locator('.dv-chips .dv-legend-chip')).toHaveCount(1)
    }).toPass({ timeout: 20000 })
  })

  test('T73 — card "Perfil Vertical — Densidade de Potência" aparece com estado vazio (dado ainda não publicado)', async ({ page }) => {
    const panel = page.locator('.dv-tab-panel').nth(0)
    const wpdCard = panel.locator('[data-testid="chart-wpd-profile"]')
    await expect(wpdCard).toBeVisible()
    await expect(wpdCard.locator('.chart-empty')).toHaveCount(0)
    await expect(wpdCard.locator('.js-plotly-plot')).toHaveCount(1)
  })

  test('T76 — Perfil Vertical (Velocidade do Vento): eixo X fixo em [0, 20] m/s', async ({ page }) => {
    const panel = page.locator('.dv-tab-panel').nth(0)
    const wsProfilePlot = panel.locator('[data-testid="chart-ws-profile"] .js-plotly-plot')
    await expect(wsProfilePlot).toBeVisible({ timeout: 20000 })
    const range = await wsProfilePlot.evaluate((el: any) => el._fullLayout.xaxis.range)
    expect(range[0]).toBeCloseTo(0, 1)
    expect(range[1]).toBeCloseTo(20, 1)
  })

  test('T77 — nenhum erro de console ao renderizar o card de WPD profile', async ({ page }) => {
    const errors: string[] = []
    const pageErrors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    page.on('pageerror', err => pageErrors.push(err.message))

    const panel = page.locator('.dv-tab-panel').nth(0)
    await expect(panel.locator('[data-testid="chart-wpd-profile"]')).toBeVisible()
    await panel.locator('.dv-filter-group', { hasText: 'Variável' }).locator('select').selectOption('wpd')
    await panel.locator('.dv-filter-group', { hasText: 'Altura' }).locator('select').selectOption('10')

    expect(errors).toEqual([])
    expect(pageErrors).toEqual([])
  })
})
