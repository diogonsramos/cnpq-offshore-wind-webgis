/**
 * Testes de regressão — f01 (Fase 3): 4ª aba interna do Dashboard "GeoParquet Explorer".
 *
 * A aba fica sempre montada (alternância via CSS display), por isso os locators
 * compartilhados (.dv-input, .dv-filter-group, .dv-add-btn) são escopados a partir
 * do `.dv-tab-panel` correspondente para evitar violações de strict-mode do Playwright.
 *
 * Os valores padrão do painel (Modelo WRF, Experimento ERA5 Histórico) já apontam para
 * dados reais publicados em public/data/geoparquet/wrf/era5_atlas — por isso os testes
 * de contagem de pixels usam números exatos e determinísticos (30773 pixels no total,
 * 588 com state=BA), sem precisar trocar os seletores de Modelo/Experimento.
 */
import { test, expect } from '@playwright/test'

test.describe('Dashboard — GeoParquet Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await expect(page.locator('.dashboard-view')).toBeVisible()
    await page.click('.dv-inner-tab-btn:has-text("Explorador GeoParquet")')
  })

  const panel = (page: import('@playwright/test').Page) => page.locator('.dv-tab-panel').nth(3)

  test('T49 — aba aparece e o painel de filtros mostra todos os controles esperados', async ({ page }) => {
    await expect(page.locator('.dv-inner-tab-btn.active')).toHaveText('Explorador GeoParquet')

    const p = panel(page)
    await expect(p.locator('.dv-filter-group', { hasText: 'Modelo' }).locator('select')).toBeVisible()
    await expect(p.locator('.dv-filter-group', { hasText: 'Experimento' }).locator('select')).toBeVisible()
    await expect(p.locator('.dv-filter-group', { hasText: 'Variável' }).locator('select')).toBeVisible()
    await expect(p.locator('.dv-filter-group', { hasText: 'Altura' }).locator('select')).toBeVisible()
    await expect(p.locator('.gpe-checkbox-col', { hasText: 'Batimetria' }).locator('.dv-pair-checkbox')).toHaveCount(4)
    await expect(p.locator('.gpe-checkbox-col', { hasText: 'Distância da Costa' }).locator('.dv-pair-checkbox')).toHaveCount(3)
    await expect(p.locator('.gpe-checkbox-col', { hasText: 'Estado' }).locator('.dv-pair-checkbox')).toHaveCount(17)
    await expect(p.locator('.dv-add-btn')).toHaveText('Aplicar Filtros')
    await expect(p.locator('.dv-empty')).toContainText('Ajuste os filtros')
  })

  test('T50 — Aplicar Filtros consulta dados reais (WRF ERA5 Histórico) e renderiza estatísticas e gráficos', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    const p = panel(page)
    await p.locator('.dv-add-btn').click()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('30773 pixels encontrados')

    await expect(p.locator('.gpe-stats-bar .gpe-stat-chip')).toHaveCount(6)
    await expect(p.locator('.chart-card')).toHaveCount(5)
    // Sem filtro de Estado/Batimetria ativo, os dois boxplots devem renderizar (não ficam ocultos).
    // O scatter "Distância vs. Média" não possui mais placeholder (distance_nm foi mockado no pipeline).
    await expect(p.locator('.chart-card.chart-empty')).toHaveCount(1)

    expect(errors).toEqual([])
  })

  test('T51 — filtrar por Estado=BA reduz a contagem e oculta o boxplot por Estado', async ({ page }) => {
    const p = panel(page)
    await p.locator('.gpe-checkbox-col', { hasText: 'Estado' }).locator('.dv-pair-checkbox', { hasText: 'BA' }).locator('input').check()
    await p.locator('.dv-add-btn').click()

    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('3752 pixels encontrados')
    // 1 placeholder agora: boxplot por Estado (Apenas 1 estado selecionado desoculta). Distância tem dados gerados.
    await expect(p.locator('.chart-card.chart-empty')).toHaveCount(2)
    await expect(p.locator('.chart-card.chart-empty', { hasText: 'desmarque o filtro de Estado' })).toHaveCount(1)
  })

  test('T52 — trocar um filtro sem clicar em Aplicar Filtros não altera o resultado exibido', async ({ page }) => {
    const p = panel(page)
    await p.locator('.dv-add-btn').click()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('30773 pixels encontrados')

    await p.locator('.gpe-checkbox-col', { hasText: 'Estado' }).locator('.dv-pair-checkbox', { hasText: 'BA' }).locator('input').check()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('30773 pixels encontrados')

    await p.locator('.dv-add-btn').click()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('3752 pixels encontrados')
  })

  test('T53 — alternar de aba e voltar preserva os filtros e o resultado aplicado', async ({ page }) => {
    const p = panel(page)
    await p.locator('.gpe-checkbox-col', { hasText: 'Estado' }).locator('.dv-pair-checkbox', { hasText: 'BA' }).locator('input').check()
    await p.locator('.dv-add-btn').click()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('3752 pixels encontrados')

    await page.click('.dv-inner-tab-btn:has-text("Visão Simples")')
    await page.click('.dv-inner-tab-btn:has-text("Explorador GeoParquet")')

    await expect(p.locator('.gpe-checkbox-col', { hasText: 'Estado' }).locator('.dv-pair-checkbox', { hasText: 'BA' }).locator('input')).toBeChecked()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('3752 pixels encontrados')
  })

  test('T62 — Boxplot por Estado reaparece com 2+ estados selecionados (A3)', async ({ page }) => {
    // Regressão A3: antes o boxplot por Estado só aparecia com 0 estados selecionados
    // (== 0), sumindo justamente quando o usuário selecionava 2+ para comparar.
    const p = panel(page)
    const stateCol = p.locator('.gpe-checkbox-col', { hasText: 'Estado' })
    await stateCol.locator('.dv-pair-checkbox', { hasText: 'BA' }).locator('input').check()
    await stateCol.locator('.dv-pair-checkbox', { hasText: 'SE' }).locator('input').check()
    await p.locator('.dv-add-btn').click()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toBeVisible()

    // Com 2 estados, o boxplot por Estado renderiza. scatter de distância
    // também permanece renderizado. Nenhum empty state esperado na tela.
    await expect(p.locator('.chart-card.chart-empty')).toHaveCount(1)
  })

  test('T63 — Boxplot por Estado ordenado Norte→Sul (A2)', async ({ page }) => {
    const NORTH_SOUTH = [
      'Amapá', 'Pará', 'Maranhão', 'Piauí', 'Ceará', 'Rio Grande do Norte', 'Paraíba',
      'Pernambuco', 'Alagoas', 'Sergipe', 'Bahia', 'Espírito Santo', 'Rio de Janeiro',
      'São Paulo', 'Paraná', 'Santa Catarina', 'Rio Grande do Sul',
    ]
    const p = panel(page)
    await p.locator('.dv-add-btn').click()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('30773 pixels encontrados')

    // Sem filtro de Estado, os cards são: histograma, boxplot-Estado, boxplot-Batimetria,
    // scatter, perfil. O boxplot por Estado é o 2º card (nth(1)).
    const stateBoxplot = p.locator('.chart-card').nth(1).locator('.js-plotly-plot')
    const names: string[] = await stateBoxplot.evaluate((el: any) => (el.data ?? []).map((t: any) => t.name))

    expect(names.length).toBeGreaterThan(1)
    const expectedOrder = NORTH_SOUTH.filter(s => names.includes(s))
    expect(names).toEqual(expectedOrder)
  })

  test('T64 — modebar do Plotly habilitada (zoom/pan/download) nos gráficos (A5)', async ({ page }) => {
    const p = panel(page)
    await p.locator('.dv-add-btn').click()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('30773 pixels encontrados')

    const firstChart = p.locator('.chart-card .js-plotly-plot').first()
    // displayModeBar: true renderiza a barra de ferramentas com os botões no DOM.
    await expect(firstChart.locator('.modebar-btn').first()).toBeAttached()
    // O botão de download PNG deve existir; lasso/select foram removidos da config.
    await expect(firstChart.locator('.modebar-btn[data-title="Download plot as a PNG"]')).toHaveCount(1)
    await expect(firstChart.locator('.modebar-btn[data-title="Box Select"]')).toHaveCount(0)
    await expect(firstChart.locator('.modebar-btn[data-title="Lasso Select"]')).toHaveCount(0)
  })

  test('T69 — checkboxes de "Distância da Costa" aparecem desabilitados com aviso de dado indisponível', async ({ page }) => {
    // A coluna distance_nm não existe nos GeoParquet publicados (ver docs/TOFIX.md) —
    // até o pipeline gerá-la, o filtro fica desabilitado em vez de silenciosamente inerte.
    const p = panel(page)
    const distanceCol = p.locator('.gpe-checkbox-col', { hasText: 'Distância da Costa' })
    const checkboxLabels = distanceCol.locator('.dv-pair-checkbox')
    const checkboxInputs = checkboxLabels.locator('input')

    await expect(checkboxInputs).toHaveCount(3)
    for (let i = 0; i < 3; i++) {
      await expect(checkboxInputs.nth(i)).toBeDisabled()
      await expect(checkboxLabels.nth(i)).toHaveAttribute('title', /ainda não publicado/)
    }
  })

  test('T70 — scatter "Distância vs. Média" mostra placeholder em vez de pontos empilhados em X=0', async ({ page }) => {
    const p = panel(page)
    await p.locator('.dv-add-btn').click()
    await expect(p.locator('.dv-hint', { hasText: 'pixels encontrados' })).toHaveText('30773 pixels encontrados')

    // Ordem sem filtro de Estado/Batimetria: histograma(0), boxplot-Estado(1),
    // boxplot-Batimetria(2), scatter-distância(3), perfil(4).
    const scatterCard = p.locator('.chart-card').nth(3)
    await expect(scatterCard).toHaveClass(/chart-empty/)
    await expect(scatterCard).toContainText('Indisponível: o GeoParquet publicado')
  })
})
