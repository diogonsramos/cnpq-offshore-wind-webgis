import { test, expect } from '@playwright/test'

test.describe('Gerador de Screenshots para o Tour', () => {
  // Ajuste do tempo de limite para aguardar os tiles do mapa e do dashboard
  test.setTimeout(60000)

  test('Deve capturar as telas da Landing Page, WebGIS e Dashboard', async ({ page }) => {
    // Definir viewport fixo para garantir que as coordenadas de clique sejam precisas
    
    // Definir viewport fixo para garantir que as coordenadas de clique sejam precisas
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Disable tour
    await page.addInitScript(() => {
      window.localStorage.setItem('hasCompletedTour', 'true');
    });


    // 0. Landing Page (Recortes)
    await page.goto('/')
    await expect(page.locator('.landing')).toBeVisible({ timeout: 10000 })
    // Aguarda carregar logos e imagens
    await page.waitForTimeout(2000)
    
    await page.locator('#inicio').screenshot({ path: 'public/images/screens/passo0_lp_1_inicio.png' })
    await page.locator('#metodologia').screenshot({ path: 'public/images/screens/passo0_lp_2_metodologia.png' })
    await page.locator('#modelos').screenshot({ path: 'public/images/screens/passo0_lp_3_modelos.png' })
    await page.locator('#dados').screenshot({ path: 'public/images/screens/passo0_lp_4_dados.png' })
    await page.locator('#equipe').screenshot({ path: 'public/images/screens/passo0_lp_5_equipe.png' })
    await page.locator('#faq').screenshot({ path: 'public/images/screens/passo0_lp_6_faq.png' })

    // 1. Visão Geral (WebGIS)
    await page.goto('/#map')

    // Dismiss tour if present
    const tourDecline = page.locator('.tour-modal-buttons button:first-child')
    if (await tourDecline.isVisible()) {
      await tourDecline.click()
    }
    // Espera a side panel aparecer
    await expect(page.locator('.side-panel')).toBeVisible({ timeout: 10000 })
    // Espera o canvas do mapa
    await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 10000 })
    
    // Aguarda um pouco extra para os COGs ou polígonos carregarem as cores
    await page.waitForTimeout(5000)

    await page.screenshot({ path: 'public/images/screens/passo1_visao_geral.png', fullPage: true })

    // 2. Filtros (Painel Lateral)
    await page.locator('.side-panel').screenshot({ path: 'public/images/screens/passo2_filtros.png' })

    // 3. Clicar no mapa para gerar os gráficos
    // Como o mapa centraliza em [-38.5, -4.5] (litoral do Ceará offshore), clicar no centro geográfico:
    // Painel lateral tem 320px. Centro do mapa é x = 320 + (1280 - 320) / 2 = 800, y = 360
    await page.waitForTimeout(2000);
    await page.mouse.click(800, 360)
    
    // Aguarda o painel de info do pixel aparecer
    await expect(page.locator('.pixel-panel')).toBeVisible({ timeout: 10000 })
    
    // Tira screenshot focado no painel de informações do pixel (rosa dos ventos pequena, etc)
    await page.locator('.pixel-panel').screenshot({ path: 'public/images/screens/passo2b_pixel_panel.png' })
    
    // 4. Ir para o Dashboard
    // Clicando na aba do dashboard no header
    await page.click('.gh-nav-link:has-text("Dashboard")', { force: true })
    await expect(page.locator('.dashboard-view')).toBeVisible({ timeout: 10000 })
    
    // Aguarda os gráficos renderizarem (eles podem levar uns segundos dependendo do parquet local)
    await page.waitForTimeout(4000)
    
    await page.screenshot({ path: 'public/images/screens/passo3_dashboard.png', fullPage: true })
  })
})
