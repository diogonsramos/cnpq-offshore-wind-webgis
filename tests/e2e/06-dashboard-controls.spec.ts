/**
 * Testes de regressão — f01: Seletores de Experimento/Modelo no Dashboard e opacidade do COG
 *
 * Verifica que os seletores do Dashboard ficam habilitados e sincronizados com o
 * SidePanel (mesmo estado global em App.tsx), e que o slider de opacidade do COG
 * funciona no SidePanel.
 */
import { test, expect } from '@playwright/test'

test.describe('Dashboard — seletores de Experimento e Modelo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await expect(page.locator('.dashboard-view')).toBeVisible()
  })

  test('T38 — Experiment select do Dashboard não está desabilitado e reflete no SidePanel', async ({ page }) => {
    const experimentSelect = page.locator('.dv-tab-panel').first().locator('.dv-filter-group', { hasText: 'Experimento' }).locator('select')
    await expect(experimentSelect).toBeEnabled()

    await experimentSelect.selectOption('SSP2-4.5_futuro')

    await page.click('.tab-btn:has-text("WebGIS Map")')
    const combobox = page.locator('.select-field', { hasText: 'Experimento' }).locator('.combobox-input')
    await expect(combobox).toHaveAttribute('placeholder', /SSP2-4\.5 \(Futuro\)/)
  })

  test('T39 — Model select aparece no Dashboard com WRF/MPAS e reflete no SidePanel', async ({ page }) => {
    const modelSelect = page.locator('.dv-tab-panel').first().locator('.dv-filter-group', { hasText: 'Modelo' }).locator('select')
    await expect(modelSelect).toBeVisible()
    await expect(modelSelect.locator('option')).toHaveCount(2)

    await modelSelect.selectOption('mpas')

    await page.click('.tab-btn:has-text("WebGIS Map")')
    const sidePanelModelSelect = page.locator('.select-field', { hasText: 'Modelo' }).locator('select')
    await expect(sidePanelModelSelect).toHaveValue('mpas')
  })
})

test.describe('SidePanel — opacidade do COG', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-primary')
    await expect(page.locator('.tab-bar')).toBeVisible()
    await page.click('.accordion-header:has-text("Camada COG")')
  })

  test('T40 — slider de opacidade aparece com valor inicial 70%', async ({ page }) => {
    const slider = page.locator('.range-field input[type="range"]')
    await expect(slider).toHaveValue('0.7')
    await expect(page.locator('.range-field .label')).toContainText('70%')
  })

  test('T41 — mover o slider atualiza o texto de porcentagem exibido', async ({ page }) => {
    const slider = page.locator('.range-field input[type="range"]')
    await slider.focus()
    await slider.press('ArrowRight')
    await expect(slider).toHaveValue('0.8')
    await expect(page.locator('.range-field .label')).toContainText('80%')
  })

  test('T42 — nenhum erro de console ao mover o slider e alternar de aba', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    const slider = page.locator('.range-field input[type="range"]')
    await slider.focus()
    await slider.press('ArrowRight')
    await slider.press('ArrowLeft')

    await page.click('.tab-btn:has-text("Analytical Dashboard")')
    await expect(page.locator('.dashboard-view')).toBeVisible()

    expect(errors).toEqual([])
  })

  test('T43 — trocar o experimento (WRF) recarrega o parquet real sem erro de console', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    const experimentSelect = page.locator('.select-field', { hasText: 'Experimento' }).locator('.combobox-input')
    await experimentSelect.click()
    await page.locator('.combobox-option-label', { hasText: / Histórico$/ }).click()

    await page.waitForTimeout(500)

    expect(errors).toEqual([])
  })
})
