/**
 * Testes de regressão — Fase 2 (TOFIX): Cards de equipe e FAQ na landing page
 *
 * Verifica cards de pesquisadores com avatar, link Lattes e o accordion de FAQ.
 */
import { test, expect } from '@playwright/test'

test.describe('TeamSection — avatares e links Lattes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('T28 — cada card de equipe exibe um avatar (img)', async ({ page }) => {
    const avatars = page.locator('.lp-team-avatar')
    await expect(avatars).toHaveCount(17)
  })

  test('T29 — cards de equipe são links para o Lattes (href contém lattes.cnpq.br)', async ({ page }) => {
    const cards = page.locator('.lp-team-card')
    const count = await cards.count()
    for (let i = 0; i < count; i++) {
      const href = await cards.nth(i).getAttribute('href')
      expect(href).toContain('lattes.cnpq.br')
    }
  })

  test('T30 — card do coordenador tem classe lp-team-card--coord', async ({ page }) => {
    const coordCard = page.locator('.lp-team-card--coord')
    await expect(coordCard).toHaveCount(1)
    await expect(coordCard).toContainText('Davidson Martins Moreira')
  })

  test('T31 — cards de pesquisadores líderes têm classe lp-team-card--lead', async ({ page }) => {
    const leadCards = page.locator('.lp-team-card--lead')
    await expect(leadCards).toHaveCount(2)
  })
})

test.describe('FAQSection — accordion na landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('T32 — seção FAQ está presente na landing page', async ({ page }) => {
    await expect(page.locator('#faq')).toHaveCount(1)
    await expect(page.locator('.lp-faq-list')).toBeVisible()
  })

  test('T33 — FAQ exibe 20 perguntas', async ({ page }) => {
    const items = page.locator('.lp-faq-item')
    await expect(items).toHaveCount(20)
  })

  test('T34 — perguntas do FAQ estão fechadas por padrão', async ({ page }) => {
    const questions = page.locator('.lp-faq-question')
    const count = await questions.count()
    for (let i = 0; i < count; i++) {
      await expect(questions.nth(i)).toHaveAttribute('aria-expanded', 'false')
    }
    await expect(page.locator('.lp-faq-answer')).toHaveCount(0)
  })

  test('T35 — clique em uma pergunta abre a resposta', async ({ page }) => {
    await page.locator('.lp-faq-question').first().click()
    await expect(page.locator('.lp-faq-question').first()).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('.lp-faq-answer')).toHaveCount(1)
  })

  test('T36 — clique em pergunta já aberta a fecha', async ({ page }) => {
    await page.locator('.lp-faq-question').first().click()
    await expect(page.locator('.lp-faq-answer')).toHaveCount(1)
    await page.locator('.lp-faq-question').first().click()
    await expect(page.locator('.lp-faq-answer')).toHaveCount(0)
  })

  test('T37 — abrir nova pergunta fecha a anterior', async ({ page }) => {
    await page.locator('.lp-faq-question').nth(0).click()
    await expect(page.locator('.lp-faq-answer')).toHaveCount(1)
    await page.locator('.lp-faq-question').nth(1).click()
    await expect(page.locator('.lp-faq-answer')).toHaveCount(1)
    await expect(page.locator('.lp-faq-question').nth(0)).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('.lp-faq-question').nth(1)).toHaveAttribute('aria-expanded', 'true')
  })
})
