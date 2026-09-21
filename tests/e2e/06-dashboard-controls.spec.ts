import { test, expect } from '@playwright/test'

test.describe('Dashboard — controles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Go to WebGIS first to set some state if needed, or directly to Dashboard
    await page.click('.gh-nav-link:has-text("Dashboard")')
    await expect(page.locator('.dashboard-view')).toBeVisible()
  })



  test('T40 — Slider de Altura e Opacidade funcionam', async ({ page }) => {
    await page.click('.gh-nav-link:has-text("WebGIS")')
    await expect(page.locator('.side-panel')).toBeVisible()
    
    // Toggle Layer settings
    await page.click('.accordion-header:has-text("Camada COG")')
    const opacitySlider = page.locator('.range-field', { hasText: 'Opacidade do COG' }).locator('input[type="range"]')
    await expect(opacitySlider).toBeVisible()
    await opacitySlider.focus()
    await opacitySlider.press('ArrowRight')
    await expect(page.locator('.range-field .label', { hasText: 'Opacidade do COG' })).toContainText('80%')
  })

  test('T41 — Fullscreen button funciona nos Chart Cards', async ({ page }) => {
    await expect(page.locator('.chart-card').first()).toBeVisible()
    
    // Clica no botão de tela cheia do primeiro cartão
    const fullscreenBtn = page.locator('.chart-card').first().locator('.chart-fullscreen-btn')
    await fullscreenBtn.click()
    
    await expect(page.locator('.chart-card--fullscreen')).toBeVisible()
    
    // Restaura
    await fullscreenBtn.click()
    await expect(page.locator('.chart-card--fullscreen')).not.toBeVisible()
  })
})
