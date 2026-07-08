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
    const pageErrors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    page.on('pageerror', err => pageErrors.push(err.message))

    const slider = page.locator('.range-field input[type="range"]')
    await slider.focus()
    await slider.press('ArrowRight')
    await slider.press('ArrowLeft')

    await page.click('.tab-btn:has-text("Analytical Dashboard")')
    await expect(page.locator('.dashboard-view')).toBeVisible()

    expect(errors).toEqual([])
    expect(pageErrors).toEqual([])
  })

  test('T43 — trocar o experimento (WRF) recarrega o parquet real sem erro de console', async ({ page }) => {
    const errors: string[] = []
    const pageErrors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    page.on('pageerror', err => pageErrors.push(err.message))

    const experimentSelect = page.locator('.select-field', { hasText: 'Experimento' }).locator('.combobox-input')
    await experimentSelect.click()
    await page.locator('.combobox-option-label', { hasText: / Histórico$/ }).click()

    await page.waitForTimeout(500)

    expect(errors).toEqual([])
    expect(pageErrors).toEqual([])
  })

  test('T57 — trocar a camada de Batimetria não lança exceção não tratada (regressão)', async ({ page }) => {
    // Regressão: fetch(file).then(r => r.json()) sem checar r.ok/content-type
    // lançava "Unexpected token '<'... is not valid JSON" (rejection não tratada,
    // invisível para page.on('console') mas visível para page.on('pageerror'))
    // sempre que a camada apontava para um arquivo inexistente — incluindo a
    // camada padrão ("ZEE Nacional"), então isso disparava em toda sessão.
    const pageErrors: string[] = []
    page.on('pageerror', err => pageErrors.push(err.message))

    await page.click('.accordion-header:has-text("Shapefiles de Batimetria")')
    await page.click('label:has-text("ZEE Nacional")')
    await page.click('label:has-text("Plataforma Nacional (0-100m)")')
    await page.click('label:has-text("Subfaixas Nacional")')
    await page.waitForTimeout(1000)

    expect(pageErrors).toEqual([])
  })
})

test.describe('Dashboard — carregamento inicial', () => {
  test('T58 — abrir o Dashboard direto não lança exceção não tratada (MapView monta por trás)', async ({ page }) => {
    // Regressão: MapView fica sempre montado atrás da aba Dashboard e busca a
    // camada de batimetria padrão assim que monta — se essa camada apontar para
    // um arquivo inexistente, toda sessão dispara uma rejection não tratada antes
    // de qualquer interação do usuário. page.on('console') não pega isso; só
    // page.on('pageerror') (por isso passou despercebido nos testes anteriores).
    // O listener precisa ser registrado antes do goto/click para capturar o erro
    // disparado no mount, que ocorre assim que a navegação para o Dashboard termina.
    const pageErrors: string[] = []
    page.on('pageerror', err => pageErrors.push(err.message))

    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await expect(page.locator('.dashboard-view')).toBeVisible()
    await page.waitForTimeout(1000)

    expect(pageErrors).toEqual([])
  })

  test('T65 — "+ Add Location" funciona sem clique prévio no mapa (auto-load do parquet)', async ({ page }) => {
    // Antes, o parquet só era buscado ao clicar no mapa ou trocar de experimento,
    // então o Add Location no Dashboard falhava com "Parquet data not loaded yet.
    // Click the map first." O Dashboard agora auto-carrega o par selecionado ao entrar.
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await expect(page.locator('.dashboard-view')).toBeVisible()

    const panel = page.locator('.dv-tab-panel').nth(0)
    await panel.locator('.dv-input').nth(0).fill('-10')
    await panel.locator('.dv-input').nth(1).fill('-35')
    await expect(async () => {
      await panel.locator('.dv-add-btn').click()
      await expect(panel.locator('.dv-chips .chip-state')).toHaveCount(1)
    }).toPass({ timeout: 20000 })

    // Nenhuma mensagem de erro "click the map first" deve aparecer.
    await expect(panel.locator('.dv-error')).toHaveCount(0)
  })
})

test.describe('Dashboard — Visão Simples: conteúdo real de Weibull e Rosa dos Ventos', () => {
  // Regressão do bug de nomenclatura de colunas (weibull_10/weibull_100 vs. weibull_10m/weibull_100m
  // reais no GeoParquet) — cobre o caso que os testes de contagem/visibilidade não pegavam.
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('.lp-cta-secondary')
    await expect(page.locator('.dashboard-view')).toBeVisible()

    // "+ Add Location" exige isLoaded() global, mas o parquet inicial só é buscado
    // ao clicar no mapa ou ao trocar Modelo/Experimento (MapView.tsx) — nunca no
    // mount, mesmo com o MapView sempre montado por trás da aba Dashboard. Trocar
    // o Experimento aqui dispara esse carregamento sem depender do canvas do mapa.
    const panel = page.locator('.dv-tab-panel').nth(0)
    await panel.locator('.dv-filter-group', { hasText: 'Experimento' }).locator('select').selectOption('HIST_historico')
  })

  test('T54 — Weibull exibe k=/c= com dado real nas alturas 10m e 100m', async ({ page }) => {
    const panel = page.locator('.dv-tab-panel').nth(0)
    await panel.locator('.dv-input').nth(0).fill('-10')
    await panel.locator('.dv-input').nth(1).fill('-35')
    // Retry: a troca de experimento acima ainda pode não ter terminado o fetch/parse
    // do parquet real no momento do clique.
    await expect(async () => {
      await panel.locator('.dv-add-btn').click()
      await expect(panel.locator('.dv-chips .chip-state')).toHaveCount(1)
    }).toPass({ timeout: 20000 })

    const weibullPlot = panel.locator('[data-testid="chart-weibull"] .js-plotly-plot')
    await expect(weibullPlot).toBeVisible({ timeout: 20000 })

    const name100 = await weibullPlot.evaluate((el: any) => el.data?.[0]?.name ?? '')
    expect(name100).toMatch(/k=\d+\.\d{2}, c=\d+\.\d{2}/)

    await panel.locator('.dv-filter-group', { hasText: 'Altura' }).locator('select').selectOption('10')
    const name10 = await weibullPlot.evaluate((el: any) => el.data?.[0]?.name ?? '')
    expect(name10).toMatch(/k=\d+\.\d{2}, c=\d+\.\d{2}/)
  })

  test('T55 — rosa dos ventos (100m) tem dado real (ao menos um setor com frequência > 0)', async ({ page }) => {
    const panel = page.locator('.dv-tab-panel').nth(0)
    await panel.locator('.dv-input').nth(0).fill('-10')
    await panel.locator('.dv-input').nth(1).fill('-35')
    await expect(async () => {
      await panel.locator('.dv-add-btn').click()
      await expect(panel.locator('.dv-chips .chip-state')).toHaveCount(1)
    }).toPass({ timeout: 20000 })

    const windRosePlot = panel.locator('[data-testid="chart-windrose"] .js-plotly-plot')
    await expect(windRosePlot).toBeVisible({ timeout: 20000 })

    const maxR = await windRosePlot.evaluate((el: any) => Math.max(0, ...(el.data?.[0]?.r ?? [])))
    expect(maxR).toBeGreaterThan(0)
  })

  test('T68 — Rosa dos Ventos: botão "Resetar zoom" restaura o autorange radial após zoom', async ({ page }) => {
    // Regressão: gráficos polar (scatterpolar) não ganham o botão nativo de reset
    // do Plotly (só cartesian/geo/3d/mapbox ganham) — sem um botão customizado,
    // dar zoom na Rosa dos Ventos deixava o usuário sem forma visível de voltar
    // à view original.
    const panel = page.locator('.dv-tab-panel').nth(0)
    await panel.locator('.dv-input').nth(0).fill('-10')
    await panel.locator('.dv-input').nth(1).fill('-35')
    await expect(async () => {
      await panel.locator('.dv-add-btn').click()
      await expect(panel.locator('.dv-chips .chip-state')).toHaveCount(1)
    }).toPass({ timeout: 20000 })

    const windRosePlot = panel.locator('[data-testid="chart-windrose"] .js-plotly-plot')
    await expect(windRosePlot).toBeVisible({ timeout: 20000 })
    await windRosePlot.scrollIntoViewIfNeeded()

    const resetBtn = windRosePlot.locator('.modebar-btn[data-title="Resetar zoom"]')
    await expect(resetBtn).toBeAttached()

    const box = (await windRosePlot.boundingBox())!
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    const initialRange = await windRosePlot.evaluate((el: any) => el._fullLayout.polar.radialaxis.range)

    // A slow, stepped drag (with small pauses) is needed for Plotly's D3-based
    // polar drag handler to register the zoom in a headless/automated context.
    await page.mouse.move(cx - 90, cy - 20)
    await page.mouse.down()
    for (let i = 1; i <= 20; i++) {
      await page.mouse.move(cx - 90 + i * 7, cy - 20 + i * 2)
      await page.waitForTimeout(20)
    }
    await page.mouse.up()

    await expect(async () => {
      const zoomedRange = await windRosePlot.evaluate((el: any) => el._fullLayout.polar.radialaxis.range)
      expect(zoomedRange).not.toEqual(initialRange)
    }).toPass({ timeout: 5000 })

    await resetBtn.click()
    await expect(async () => {
      const resetRange = await windRosePlot.evaluate((el: any) => el._fullLayout.polar.radialaxis.range)
      expect(resetRange).toEqual(initialRange)
    }).toPass({ timeout: 5000 })
  })

  test('T66 — legenda dos gráficos usa apenas "Loc N" (sem modelo/experimento) (A4)', async ({ page }) => {
    const panel = page.locator('.dv-tab-panel').nth(0)
    await panel.locator('.dv-input').nth(0).fill('-10')
    await panel.locator('.dv-input').nth(1).fill('-35')
    await expect(async () => {
      await panel.locator('.dv-add-btn').click()
      await expect(panel.locator('.dv-chips .chip-state')).toHaveCount(1)
    }).toPass({ timeout: 20000 })

    const seasonalPlot = panel.locator('[data-testid="chart-seasonal"] .js-plotly-plot')
    await expect(seasonalPlot).toBeVisible({ timeout: 20000 })
    const name = await seasonalPlot.evaluate((el: any) => el.data?.[0]?.name ?? '')
    expect(name).toBe('Loc 1')
  })

  test('T67 — trocar o experimento re-consulta os pinned locations sem erro (A1)', async ({ page }) => {
    const errors: string[] = []
    const pageErrors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    page.on('pageerror', err => pageErrors.push(err.message))

    const panel = page.locator('.dv-tab-panel').nth(0)
    await panel.locator('.dv-input').nth(0).fill('-10')
    await panel.locator('.dv-input').nth(1).fill('-35')
    await expect(async () => {
      await panel.locator('.dv-add-btn').click()
      await expect(panel.locator('.dv-chips .chip-state')).toHaveCount(1)
    }).toPass({ timeout: 20000 })

    // Troca de experimento (HIST → ERA5 Histórico): o pino persiste e os gráficos
    // continuam renderizando dados válidos (re-consulta contra o novo par).
    await panel.locator('.dv-filter-group', { hasText: 'Experimento' }).locator('select').selectOption('ERA5_atlas_historico')

    const weibullPlot = panel.locator('[data-testid="chart-weibull"] .js-plotly-plot')
    await expect(async () => {
      const name = await weibullPlot.evaluate((el: any) => el.data?.[0]?.name ?? '')
      expect(name).toMatch(/k=\d+\.\d{2}, c=\d+\.\d{2}/)
    }).toPass({ timeout: 20000 })

    await expect(panel.locator('.dv-chips .chip-state')).toHaveCount(1)
    expect(errors).toEqual([])
    expect(pageErrors).toEqual([])
  })

  test('T59 — "Remove All" remove todos os locais fixados (regressão)', async ({ page }) => {
    // Regressão: o forEach chamava onRemoveLocation(i) com os índices originais
    // (0,1,2) em sequência; como cada chamada já filtra o array pelo índice atual,
    // remover em ordem ascendente deixava sempre 1 local para trás (o do meio).
    const panel = page.locator('.dv-tab-panel').nth(0)
    const chips = panel.locator('.dv-chips .chip-state')

    // 1º pino: retry até o parquet global terminar de carregar (mesmo motivo do T54/T55).
    await panel.locator('.dv-input').nth(0).fill('-10')
    await panel.locator('.dv-input').nth(1).fill('-35')
    await expect(async () => {
      await panel.locator('.dv-add-btn').click()
      await expect(chips).toHaveCount(1)
    }).toPass({ timeout: 20000 })

    // 2º e 3º pinos: isLoaded() já é true, um clique basta.
    for (const [lat, lon, expected] of [['-13', '-38', 2], ['-23', '-42', 3]] as const) {
      await panel.locator('.dv-input').nth(0).fill(lat)
      await panel.locator('.dv-input').nth(1).fill(lon)
      await panel.locator('.dv-add-btn').click()
      await expect(chips).toHaveCount(expected)
    }

    await panel.locator('.dv-remove-all').click()
    await expect(chips).toHaveCount(0)
  })
})
