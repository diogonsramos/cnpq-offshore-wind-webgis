/**
 * Testes de regressão — Fase 1: Navegação entre Landing Page e sistema
 *
 * Verifica todos os pontos de entrada para o sistema (CTAs, navbar, TabBar)
 * e o retorno para a landing page via botão "← Home".
 */
import { test, expect } from '@playwright/test'

test.describe('Navegação: Landing → Sistema', () => {
  test('T04 — CTA primário "Abrir Mapa" abre o mapa', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-primary')
    await expect(page.locator('.tab-bar')).toBeVisible()
    await expect(page.locator('.landing')).not.toBeVisible()
  })

  test('T05 — CTA secundário "Abrir Dashboard" abre o dashboard', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await expect(page.locator('.tab-bar')).toBeVisible()
    await expect(page.locator('.dashboard-view')).toBeVisible()
  })


})

test.describe('Navegação: Sistema → Landing (botão ← Home)', () => {
  test('T10 — botão "← Home" está visível no TabBar após navegar para o mapa', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-primary')
    await expect(page.locator('.tab-home-btn')).toBeVisible()
    await expect(page.locator('.tab-home-btn')).toContainText('Home')
  })

  test('T11 — clique em "← Home" retorna para a landing page', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-primary')
    await page.click('.tab-home-btn')
    await expect(page.locator('.landing')).toBeVisible()
    await expect(page.locator('.tab-bar')).not.toBeVisible()
  })

  test('T11b — "← Home" também funciona vindo do dashboard', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await page.click('.tab-home-btn')
    await expect(page.locator('.landing')).toBeVisible()
    await expect(page.locator('.tab-bar')).not.toBeVisible()
  })
})

test.describe('Preservação de estado durante navegação', () => {
  test('T07 — TabBar mantém aba ativa correta ao alternar entre mapa e dashboard', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-primary')
    // Deve estar na aba do mapa
    await expect(page.locator('.tab-btn.active')).toContainText('WebGIS Map')
    // Alterna para dashboard
    await page.click('.tab-btn:has-text("Analytical Dashboard")')
    await expect(page.locator('.tab-btn.active')).toContainText('Analytical Dashboard')
    await expect(page.locator('.dashboard-view')).toBeVisible()
  })
})
