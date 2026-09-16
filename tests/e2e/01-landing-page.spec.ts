/**
 * Testes de regressão — Fase 1: Landing Page
 *
 * Verifica que a landing page abre como tela inicial, exibe o conteúdo
 * correto em todas as seções e não mostra elementos internos do sistema
 * (TabBar) antes da navegação.
 */
import { test, expect } from '@playwright/test'

test.describe('Landing Page — carregamento inicial', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('T02 — landing page é a tela inicial (não o mapa)', async ({ page }) => {
    await expect(page.locator('.landing')).toBeVisible()
    await expect(page.locator('.tab-bar')).not.toBeVisible()
  })

  test('T03 — H1 contém o título oficial do projeto', async ({ page }) => {
    await expect(page.locator('.lp-hero h1')).toContainText(
      'Cenário atual e futuro do recurso eólico offshore no Brasil'
    )
  })
})

test.describe('Landing Page — seções de conteúdo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('NavbarTop — logos visíveis', async ({ page }) => {
    await expect(page.locator('.lp-navbar')).toBeVisible()
    await expect(page.locator('.lp-navbar-logo').first()).toBeVisible()
  })

  test('HeroSection — dois CTAs visíveis', async ({ page }) => {
    await expect(page.locator('.lp-cta-primary')).toBeVisible()
    await expect(page.locator('.lp-cta-secondary')).toBeVisible()
    await expect(page.locator('.lp-cta-primary')).toContainText('Abrir Mapa')
    await expect(page.locator('.lp-cta-secondary')).toContainText('Abrir Dashboard')
  })


  test('T08 — ScenariosSection — 4 cards de experimentos visíveis', async ({ page }) => {
    const cards = page.locator('.lp-scenario-card')
    await expect(cards).toHaveCount(4)
  })

  test('TeamSection — 17 pesquisadores listados', async ({ page }) => {
    const cards = page.locator('.lp-team-card')
    await expect(cards).toHaveCount(17)
  })

  test('PublicationsSection — 11 publicações listadas', async ({ page }) => {
    const items = page.locator('.lp-pub-card')
    await expect(items).toHaveCount(11)
  })


  test('T09 — logos institucionais carregam sem erro (2xx ou 304)', async ({ page }) => {
    const logoStatuses: number[] = []
    page.on('response', res => {
      if (res.url().includes('/images/logos/')) logoStatuses.push(res.status())
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(logoStatuses.length).toBeGreaterThan(0)
    // 200 (fresh) e 304 (cached) são ambos válidos; qualquer 4xx/5xx indica falha
    expect(logoStatuses.every(s => s < 400)).toBe(true)
  })
})


