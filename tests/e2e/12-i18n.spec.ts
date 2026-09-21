import { test, expect } from '@playwright/test'

test.describe('Locale switcher — Header Global', () => {
  test('T89 — toggle PT/EN/ES aparece no Header Global', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.gh-locale')).toBeVisible()
    await expect(page.locator('.locale-btn[title="pt-BR"]')).toHaveClass(/active/)
  })

  test('T90 — clicar em EN traduz o H1 da landing page', async ({ page }) => {
    await page.goto('/')
    await page.click('.locale-btn[title="en"]')
    await expect(page.locator('.lp-hero h1')).toContainText('Current and future scenario of offshore wind resource in Brazil')
  })

  test('T91 — trocar para EN traduz o texto no Header', async ({ page }) => {
    await page.goto('/')
    await page.click('.locale-btn[title="en"]')
    await expect(page.locator('.gh-nav-link').nth(1)).toContainText('Methodology')
  })

  test('T92 — escolha de idioma persiste no localStorage', async ({ page }) => {
    await page.goto('/')
    await page.click('.locale-btn[title="en"]')
    await page.reload()
    await expect(page.locator('.locale-btn[title="en"]')).toHaveClass(/active/)
    await expect(page.locator('.lp-hero h1')).toContainText('Current')
  })
})
