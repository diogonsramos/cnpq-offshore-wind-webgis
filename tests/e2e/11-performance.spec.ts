import { test, expect } from '@playwright/test'

const PLOTLY_REQUEST = /plotly/i

test.describe('Lazy-loading do Plotly', () => {
  test('T86 — aba Map nunca dispara requisição de rede do Plotly inicialmente', async ({ page }) => {
    const plotlyRequests: string[] = []
    page.on('request', req => {
      if (PLOTLY_REQUEST.test(req.url())) plotlyRequests.push(req.url())
    })

    await page.goto('/')
    await page.click('.lp-cta-primary')
    await expect(page.locator('.map-container')).toBeVisible()
    await page.waitForTimeout(1500)

    expect(plotlyRequests).toEqual([])
  })

  test('T87 — entrar no Dashboard carrega o módulo Plotly sob demanda', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-primary')
    await expect(page.locator('.map-container')).toBeVisible()

    const plotlyRequest = page.waitForRequest(PLOTLY_REQUEST, { timeout: 15000 })
    await page.click('.gh-nav-link:has-text("Dashboard")')
    await expect(plotlyRequest).resolves.toBeTruthy()
  })
})
