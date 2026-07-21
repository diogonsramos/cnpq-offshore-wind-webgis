/**
 * Testes de regressão — f04: performance
 *
 * Cobre: lazy-loading do Plotly (só carrega ao entrar no Dashboard, nunca no
 * Map) e a preservação de estado da Visão Simples ao alternar Dashboard → Map
 * → Dashboard, agora que o primeiro mount de DashboardView é condicional
 * (gate `dashboardVisited` em App.tsx) em vez de sempre montado.
 */
import { test, expect } from '@playwright/test'

const PLOTLY_REQUEST = /plotly/i

test.describe('Lazy-loading do Plotly (f04)', () => {
  test('T86 — aba Map nunca dispara requisição de rede do Plotly', async ({ page }) => {
    const plotlyRequests: string[] = []
    page.on('request', req => {
      if (PLOTLY_REQUEST.test(req.url())) plotlyRequests.push(req.url())
    })

    await page.goto('/')
    await page.click('.lp-cta-primary')
    await expect(page.locator('.map-container')).toBeVisible()
    // Dá tempo para qualquer fetch de módulo assíncrono (se existisse) disparar.
    await page.waitForTimeout(1500)

    expect(plotlyRequests).toEqual([])
  })

  test('T87 — entrar no Dashboard carrega o módulo Plotly sob demanda', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-primary')
    await expect(page.locator('.map-container')).toBeVisible()

    const plotlyRequest = page.waitForRequest(PLOTLY_REQUEST, { timeout: 15000 })
    await page.click('.tab-btn:has-text("Analytical Dashboard")')
    await expect(plotlyRequest).resolves.toBeTruthy()
  })
})

test.describe('Preservação de estado — DashboardView com mount condicional (f04)', () => {
  test('T88 — alternar Dashboard → Map → Dashboard preserva a Altura selecionada na Visão Simples', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await expect(page.locator('.dashboard-view')).toBeVisible()

    const panel = page.locator('.dv-tab-panel').nth(0)
    const heightSelect = panel.locator('.dv-filter-group', { hasText: 'Altura' }).locator('select')
    await heightSelect.selectOption('50')
    await expect(heightSelect).toHaveValue('50')

    await page.click('.tab-btn:has-text("WebGIS Map")')
    await expect(page.locator('.map-container')).toBeVisible()
    await page.click('.tab-btn:has-text("Analytical Dashboard")')

    await expect(heightSelect).toHaveValue('50')
  })
})
