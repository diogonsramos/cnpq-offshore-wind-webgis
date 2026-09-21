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
    await expect(page.locator('.map-container')).toBeVisible()
    await expect(page.locator('.landing')).not.toBeVisible()
  })

  test('T05 — CTA secundário "Abrir Dashboard" abre o dashboard', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await expect(page.locator('.global-header')).toBeVisible()
    await expect(page.locator('.dashboard-view')).toBeVisible()
  })


})

test.describe('Navegação: Sistema → Landing (botão ← Home)', () => {
  test('T10 — botão "Home" está visível no Header após navegar para o mapa', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-primary')
    await expect(page.locator('.gh-nav-link:has-text("Home")')).toBeVisible()
  })

  test('T11 — clique em "Home" retorna para a landing page', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-primary')
    await page.click('.gh-nav-link:has-text("Home")')
    await expect(page.locator('.landing')).toBeVisible()
    await expect(page.locator('.map-container')).not.toBeVisible()
  })

  test('T11b — "Home" também funciona vindo do dashboard', async ({ page }) => {
    await page.goto('/')
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await page.click('.gh-nav-link:has-text("Home")')
    await expect(page.locator('.landing')).toBeVisible()
    await expect(page.locator('.dashboard-view')).not.toBeVisible()
  })
})

test.describe('Preservação de estado durante navegação', () => {
  test('T07 — Header mantém aba ativa correta ao alternar entre mapa e dashboard', async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-primary')
    // Deve estar na aba do mapa
    await expect(page.locator('.gh-nav-link.active')).toContainText('WebGIS')
    // Alterna para dashboard
    await page.click('.gh-nav-link:has-text("Dashboard")')
    await expect(page.locator('.gh-nav-link.active')).toContainText('Dashboard')
    await expect(page.locator('.dashboard-view')).toBeVisible()
  })
})
