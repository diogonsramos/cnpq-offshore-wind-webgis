/**
 * Testes de regressão — f03: melhorias de UI/UX
 *
 * Cobre: spinner de carregamento do COG, exportação CSV do Dashboard, tela
 * cheia dos gráficos, rosa dos ventos colorida por velocidade média e os
 * novos basemaps + screenshot do mapa.
 */
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

async function pinLocation(panel: import('@playwright/test').Locator) {
  await panel.locator('.dv-input').nth(0).fill('-10')
  await panel.locator('.dv-input').nth(1).fill('-35')
  await expect(async () => {
    await panel.locator('.dv-add-btn').click()
    await expect(panel.locator('.dv-chips .dv-legend-chip')).toHaveCount(1)
  }).toPass({ timeout: 20000 })
}

test.describe('MapView — basemaps extras e screenshot (f03)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-primary')
    await expect(page.locator('.tab-bar')).toBeVisible()
  })

  test('T78 — BasemapSwitcher exibe 6 opções (incl. Terrain/Night/Topo) e alternar não gera erro de console', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    const buttons = page.locator('.basemap-btn')
    await expect(buttons).toHaveCount(6)

    for (const label of ['Terrain', 'Night', 'Topo', 'Street']) {
      await buttons.filter({ hasText: label }).click()
      await expect(buttons.filter({ hasText: label })).toHaveClass(/active/)
    }
    await page.waitForTimeout(500)

    expect(errors).toEqual([])
  })

  test('T79 — botão "Screenshot" do mapa baixa um PNG com nome datado', async ({ page }) => {
    await expect(page.locator('.map-screenshot-btn')).toBeVisible()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('.map-screenshot-btn'),
    ])
    expect(download.suggestedFilename()).toMatch(/^webgis-map-\d{4}-\d{2}-\d{2}\.png$/)
  })

  test('T80 — spinner de carregamento (.cog-loading) aparece durante o fetch do COG e some ao terminar', async ({ page }) => {
    // Sem atraso artificial, o .tif local é rápido demais para garantir a
    // captura do estado "loading" por uma asserção com retry — atrasar a
    // resposta do tile deixa o teste deterministico em vez de dependente de timing.
    await page.route('**/data/cogs/**/*.tif', async route => {
      await new Promise(r => setTimeout(r, 700))
      await route.continue()
    })
    await page.goto('/')
    await page.click('.lp-cta-primary')
    await expect(page.locator('.tab-bar')).toBeVisible()

    await expect(page.locator('.cog-loading')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.cog-loading')).toBeHidden({ timeout: 15000 })
  })
})

test.describe('Dashboard — exportação CSV, tela cheia e rosa dos ventos colorida (f03)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await expect(page.locator('.dashboard-view')).toBeVisible()
    const panel = page.locator('.dv-tab-panel').nth(0)
    await panel.locator('.dv-filter-group', { hasText: 'Experimento' }).locator('select').selectOption('hist')
  })

  test('T81 — "Download CSV" fica desabilitado sem locais fixados e habilita após adicionar um', async ({ page }) => {
    const panel = page.locator('.dv-tab-panel').nth(0)
    const csvBtn = panel.locator('.dv-export-btn')
    await expect(csvBtn).toBeDisabled()

    await pinLocation(panel)

    await expect(csvBtn).toBeEnabled()
  })

  test('T82 — clique em "Download CSV" gera um arquivo com nome e cabeçalho esperados', async ({ page }) => {
    const panel = page.locator('.dv-tab-panel').nth(0)
    await pinLocation(panel)

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      panel.locator('.dv-export-btn').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^webgis-dashboard-\d{4}-\d{2}-\d{2}\.csv$/)

    const csvPath = await download.path()
    const content = readFileSync(csvPath!, 'utf-8')
    const lines = content.trim().split('\n')
    expect(lines[0]).toBe('location,variable,height,season,mean,min,max,std')
    // 1 local fixado × 5 sazonalidades × 2 variáveis × 5 alturas = 50 linhas de dado
    expect(lines.length).toBe(51)
    expect(lines.some((l: string) => l.startsWith('Loc 1,ws,100,ANNUAL,'))).toBe(true)
  })

  test('T83 — toggle de tela cheia aplica/remove chart-card--fullscreen; Escape restaura', async ({ page }) => {
    const panel = page.locator('.dv-tab-panel').nth(0)
    await pinLocation(panel)

    const weibullCard = panel.locator('[data-testid="chart-weibull"]')
    await expect(weibullCard).not.toHaveClass(/chart-card--fullscreen/)

    await weibullCard.locator('.chart-fullscreen-btn').click()
    await expect(weibullCard).toHaveClass(/chart-card--fullscreen/)
    await expect(page.locator('.chart-fullscreen-backdrop')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(weibullCard).not.toHaveClass(/chart-card--fullscreen/)
    await expect(page.locator('.chart-fullscreen-backdrop')).toHaveCount(0)
  })

  test('T84 — clicar novamente no botão de tela cheia (2º clique) também restaura o layout', async ({ page }) => {
    const panel = page.locator('.dv-tab-panel').nth(0)
    await pinLocation(panel)

    const weibullCard = panel.locator('[data-testid="chart-weibull"]')
    await weibullCard.locator('.chart-fullscreen-btn').click()
    await expect(weibullCard).toHaveClass(/chart-card--fullscreen/)

    await weibullCard.locator('.chart-fullscreen-btn').click()
    await expect(weibullCard).not.toHaveClass(/chart-card--fullscreen/)
  })

  test('T85 — Rosa dos Ventos usa barpolar colorido por velocidade média e exibe a legenda', async ({ page }) => {
    const panel = page.locator('.dv-tab-panel').nth(0)
    await pinLocation(panel)

    const windRosePlot = panel.locator('[data-testid="chart-windrose"] .js-plotly-plot')
    await expect(windRosePlot).toBeVisible({ timeout: 20000 })

    const traceType = await windRosePlot.evaluate((el: any) => el.data?.[0]?.type)
    expect(traceType).toBe('barpolar')

    const colors: string[] = await windRosePlot.evaluate((el: any) => el.data?.[0]?.marker?.color ?? [])
    expect(new Set(colors).size).toBeGreaterThan(1)

    await expect(panel.locator('[data-testid="chart-windrose"] .windrose-legend')).toBeVisible()
  })
})
