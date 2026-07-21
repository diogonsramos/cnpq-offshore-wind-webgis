# 📝 Roadmap de Desenvolvimento & UI/UX: CNPq WebGIS Offshore

Este documento centraliza as atividades necessárias para corrigir as regressões de interface, refatorar a navegação global, implementar os gráficos analíticos baseados no padrão *Global Wind Atlas (GWA)* (https://globalwindatlas.info/en/) e criar a nova Landing Page do projeto.

---

## ✅ f01 (Fase 1) — Seletores & Opacidade no Dashboard — 2026-07-03

> **Status:** Implementado e validado (`pnpm test` — 47 passed). Escopo completo em `docs/TODO_new.md`; esta fase cobre apenas a seção "Selectors & opacity". As abas de comparação (Compare Experiments/Compare Models) e o GeoParquet Explorer ficam para fases seguintes.

### Itens concluídos

| Item | Resolução |
|---|---|
| Experiment select do Dashboard desabilitado | `disabled` removido em `DashboardView.tsx`; `onChange` agora chama `setDataset` (estado global de `App.tsx`) |
| Sem Model select no Dashboard | Novo `<select>` WRF/MPAS adicionado ao `dv-filter-bar`, sincronizado com `model` global |
| Opacidade do COG fixa em `0.7` | Novo slider (0.1–1.0, step 0.1) em `SidePanel.tsx`, seção "Camada COG"; estado `cogOpacity` em `App.tsx`, aplicado via `setPaintProperty` em `MapView.tsx` sem refetch de tile |
| Trocar experimento/modelo não recarregava o parquet de consulta de pixel | Novo `useEffect` em `MapView.tsx` chama `loadParquet(dataset, model)` a cada mudança explícita (não na montagem, para não mascarar/disparar erro de dados incompleto) |
| Textos novos sem i18n (f06 ainda não mergeado) | Stub mínimo `src/i18n/t.ts` + `src/i18n/pt-BR.ts`; substituível sem alterar call sites quando f06 chegar |

### Bug pré-existente corrigido — mismatch Dataset id ↔ pastas reais de dados

Os valores do tipo `Dataset` (`ERA5_atlas_historico`, `HIST_historico`, etc.) carregam um sufixo `_historico`/`_presente`/`_futuro` que não existe nas pastas reais de `public/data/geoparquet/` e `public/data/cogs/` (ex.: pasta real é `ERA5_atlas`/`era5_atlas`, sem sufixo). Em dev, o Vite retornava fallback HTML com status 200 para esses caminhos incorretos, e `pixelQuery.ts` tentava ler HTML como Parquet, logando `"Invalid Parquet file. Corrupt footer"`. Os COGs reais também usam uma convenção mais granular (`{season}_{regiao}_{faixa_batimetria}.tif`, ex. `annual_nacional_0_100.tif`) do que a que `buildCogUrl` construía (`{season}.tif`).

**Correção:** nova função `datasetFolder(d: Dataset)` em `cogCatalog.ts` remove o sufixo antes de resolver qualquer caminho; `buildCogUrl` passou a apontar para `{season}_nacional_0_100.tif` (recorte "Plataforma Nacional 0-100m", a mesma área de interesse já usada no shapefile de batimetria); `MapView.tsx` aplica `datasetFolder()` antes de todo `loadParquet()`. Validado via `curl` no dev server: `/data/geoparquet/wrf/hist/season=annual/data.parquet` e `/data/cogs/wrf/HIST/ws10/10m/annual_nacional_0_100.tif` agora retornam os arquivos reais (não mais fallback HTML), e o teste `T43` comprova zero erro de console ao trocar de experimento.

### O que não foi implementado (limitações) e o que falta para implementar

1. **Dados do modelo MPAS inexistentes.** `public/data/cogs/mpas/` não existe e `public/data/geoparquet/mpas/` está vazio — selecionar MPAS no Dashboard ou no SidePanel resulta em "sem dados" (tratado sem erro de console, mas sem conteúdo real). **O que falta:** publicar os arquivos `.tif`/`.parquet` de MPAS seguindo a mesma convenção de nomes já usada pelo WRF (`{season}_{estado|nacional}_{faixa_batimetria}.tif` para COG; `season=<season>/data.parquet` por pasta de experimento). Nenhuma mudança de código é necessária além de publicar os dados — o pipeline de leitura já foi corrigido nesta fase e funciona para qualquer modelo/experimento cuja pasta exista.
2. **Seletor de Região/Faixa de Batimetria do COG não exposto na UI.** O recorte renderizado no mapa está fixo em `nacional_0_100` (Plataforma Nacional 0–100m) dentro de `buildCogUrl()`. Os tipos `Region` e `BathyBand` já existem em `cogCatalog.ts` (e os arquivos `.tif` por estado/faixa já existem em disco), mas não há nenhum controle de UI para o usuário trocar esse recorte. **O que falta:** (a) adicionar `region`/`bathyBand` como estado global em `App.tsx`, análogo a `cogOpacity`; (b) adicionar dois seletores no `SidePanel.tsx` (um para os 17 estados costeiros + "Nacional", outro para as faixas `0–20/20–50/50–100/0–100`); (c) estender `buildCogUrl()` para aceitar esses dois parâmetros em vez de usar os valores fixos; (d) novos testes E2E cobrindo a troca de recorte.
3. **i18n é apenas um stub, sem troca de idioma real.** `src/i18n/t.ts` lê de um único dicionário (`pt-BR.ts`); não existe `en.ts`, nem toggle de idioma na UI, nem persistência da preferência do usuário — como o próprio `docs/TODO_new.md` já antecipava, isso depende da feature `f06` (ainda não mergeada neste repositório). **O que falta:** implementar `f06` (dicionário `en.ts`, um `LanguageProvider`/estado global de idioma, um seletor de idioma na UI) e então trocar a implementação interna de `t()` para ler do dicionário ativo — sem precisar alterar nenhum call site `t('chave')` já escrito.

### Testes novos — `tests/e2e/06-dashboard-controls.spec.ts`

| Teste | O que valida |
|---|---|
| T38 | Experiment select do Dashboard habilitado; mudança reflete no combobox do SidePanel |
| T39 | Model select (WRF/MPAS) aparece no Dashboard; mudança reflete no select do SidePanel |
| T40 | Slider de opacidade aparece na seção "Camada COG" com valor inicial 70% |
| T41 | Mover o slider atualiza o texto de porcentagem exibido |
| T42 | Nenhum erro de console ao mover o slider e alternar de aba |
| T43 | Trocar o experimento (WRF) recarrega o parquet real (`hist`) sem erro de console — regressão do bug de mismatch de pastas |

### Arquivos modificados

`src/App.tsx`, `src/components/SidePanel.tsx`, `src/components/MapView.tsx`, `src/components/DashboardView.tsx`, `src/lib/cogCatalog.ts`, `src/App.css`, `src/i18n/pt-BR.ts` (novo), `src/i18n/t.ts` (novo), `tests/e2e/06-dashboard-controls.spec.ts` (novo)

---

## ✅ f01 (Fase 2) — Abas Compare Experiments / Compare Models — 2026-07-03

> **Status:** Implementado e validado (`pnpm test` — 52 passed). Escopo completo em `docs/TODO_new.md`; esta fase cobre a seção "Multi-experiment & multi-model comparison". O GeoParquet Explorer (4ª aba) fica para a fase seguinte.

### Itens concluídos

| Item | Resolução |
|---|---|
| Dashboard sem abas internas de comparação | Nova barra de abas internas (`Visão Simples` / `Comparar Experimentos` / `Comparar Modelos`) em `DashboardView.tsx`; as 3 permanecem montadas simultaneamente (alternância via CSS `display`) para preservar seleção/cache ao trocar de aba |
| Sem forma de comparar múltiplos experimentos/modelos | Novo `DashboardComparisonView.tsx` — atende as duas abas via prop `mode: 'experiments' \| 'models'`, reaproveitando os 5 tipos de gráfico (sazonal, Weibull, rosa dos ventos, perfil WS, perfil WPD) já usados na Visão Simples |
| Compare Experiments | Checkboxes para até 3 pares modelo+experimento (limite reforçado na UI); cada par ganha uma cor fixa da paleta e um "chip" de legenda acima dos gráficos |
| Compare Models | Seletor único de experimento; compara automaticamente WRF (linha sólida) vs MPAS (linha tracejada), mesma cor; métrica de diferença (%) entre as médias anuais exibida quando ambos os modelos têm dado |
| `queryDashboardLocation` só suportava o par model+experiment globalmente carregado | Assinatura estendida para `queryDashboardLocation(lat, lon, model?, experiment?)` — carrega o par informado antes de consultar, sem exigir um segundo "slot" de memória |
| Gráficos de comparação liam do singleton `allSeasonMap` (dado errado ao comparar >1 par) | Nova `seasonStat(loc, variable, height, season, stat)` em `pixelQuery.ts`, que lê direto do snapshot `DashboardLocationData` já capturado por par — não depende do estado global |
| Paleta de cores duplicada/pouco acessível | Nova `src/lib/dashboardChartConstants.ts` com paleta Okabe-Ito (colorblind-safe, equivalente a ColorBrewer/Tableau10) compartilhada entre `DashboardView` e `DashboardComparisonView` |

### Bugs pré-existentes corrigidos (necessários para a comparação funcionar corretamente)

1. **`loading` nunca era resetado após um carregamento bem-sucedido em `pixelQuery.ts`** — só o `catch` de falha zerava `loading`. Depois do primeiro `loadParquet` com sucesso na sessão, qualquer chamada subsequente para um par *diferente* de model+experiment batia no guard `if (loading) return loading` e devolvia silenciosamente a promise antiga (já resolvida) do par anterior — ou seja, comparar 2+ experimentos retornava os mesmos dados repetidos, sem erro visível. Corrigido encadeando `.then(() => { loading = null })` antes do `.catch()`.
2. **Efeito de sincronização do parquet em `MapView.tsx` disparava um fetch fantasma do dataset padrão em dev** — usava uma flag booleana (`skipParquetSyncRef`) que virava `false` após a primeira execução; o double-invoke de efeitos do React StrictMode (só em dev) repete a montagem do efeito, e na segunda repetição a flag já estava `false`, disparando um `loadParquet` indesejado do dataset global padrão. Combinado com o bug (1), esse fetch fantasma "sequestrava" a promise de carregamento e fazia a Compare Models/Experiments nunca buscar os pares reais. Corrigido trocando a flag por uma comparação contra o último valor sincronizado (`lastSyncedRef`), robusta a replays do StrictMode.
3. **`MiniMap.tsx` chamava `addSource`/`addLayer` sem esperar o carregamento do estilo do MapLibre** — inofensivo na Visão Simples (pins só são adicionados bem depois do mount), mas as novas abas de comparação criam sua própria instância de `MiniMap` e podem receber uma localização quase imediatamente, expondo a corrida ("Style is not done loading"). Corrigido com o mesmo padrão `ready`/`m.on('load', ...)` já usado em `MapView.tsx`.

### O que não foi implementado (limitações) e o que falta para implementar

1. **MPAS continua sem nenhum dado publicado** (mesma limitação da Fase 1: `public/data/cogs/mpas/` não existe; `public/data/geoparquet/mpas/` está vazio). Na aba "Comparar Modelos", o par MPAS é buscado, falha de forma limpa (sem erro de console, graças ao `console.warn` + verificação de `content-type` já introduzidos na Fase 1) e a UI mostra o chip "— sem dados disponíveis" em vez de travar ou mostrar dado errado. Consequentemente, a métrica de "Diferença MPAS vs WRF" nunca aparece na prática hoje. **O que falta:** o mesmo item 1 da Fase 1 — publicar os dados de MPAS; nenhuma mudança de código adicional é necessária.
2. **Carregamento sequencial, não concorrente, dos pares comparados.** `pixelQuery.ts` mantém uma arquitetura *single-slot* (um parquet carregado por vez). Para comparar 2–3 pares, `DashboardComparisonView.tsx` carrega um par, espera terminar, copia o resultado para um cache local e só então inicia o próximo — funciona e o resultado final é cacheado corretamente, mas para 3 pares grandes (~8MB cada) o tempo total de espera é a soma dos 3 carregamentos, não o maior deles. **O que falta:** refatorar `pixelQuery.ts` para um cache multi-slot chaveado por `model+experiment` (em vez de um único `records`/`allSeasonMap` global), permitindo carregar múltiplos pares em paralelo com `Promise.all`. É uma refatoração maior do módulo, por isso foi deixada fora do escopo desta fase — o `queryDashboardLocation(lat, lon, model?, experiment?)` já tem a assinatura certa para isso, só a implementação interna precisaria mudar.
3. **Legenda não é um widget único interativo.** O requisito pedia "uma única legenda compartilhada, no topo ou lateral do grid de gráficos". O que foi implementado é uma fileira de "chips" coloridos (mesmo padrão da Visão Simples para localizações fixadas) — resolve a associação cor↔par visualmente, mas não permite clicar num chip para esconder/mostrar aquele traço em todos os gráficos simultaneamente (o que o Plotly já faz *por gráfico*, individualmente, ao clicar na legenda nativa de cada `<Plot>`). **O que falta:** um componente de legenda customizado que, ao clicar num chip, alterne a visibilidade do traço correspondente em todos os 5 `<Plot>` do grid (via prop `visible` no array `data` de cada gráfico, controlado por um estado `Set<pairKey>` de traços ocultos).
4. **Métrica de diferença é texto simples, não annotation/subplot.** Implementada como uma linha de texto (`"Diferença MPAS vs WRF (Anual): X%"`) acima dos gráficos, cobrindo só a variável+altura selecionadas no momento — não é uma annotation dentro de cada gráfico do Plotly nem um subplot dedicado comparando todas as alturas/estações de uma vez. **O que falta:** decidir o formato final (annotation por gráfico é mais trabalhoso de implementar corretamente com o Plotly `layout.annotations`; um subplot dedicado exigiria um 6º chart card) e implementar.
5. **Títulos de gráfico e rótulos de eixo ainda não usam `t()`.** Só a "moldura" nova (nomes das abas, textos do seletor de pares, painel de localização, estados dos chips) usa i18n — os títulos/eixos dos 5 gráficos Plotly (ex. `"Média Sazonal — ..."`, `"Velocidade do Vento (m/s)"`) continuam hardcoded em pt-BR, replicando o padrão já existente na Visão Simples (que também nunca foi convertida). **O que falta:** depende do item 3 da Fase 1 (`f06` real) + uma passada dedicada convertendo essas strings em `t('dashboard.chart.xxx')` tanto em `DashboardView.tsx` quanto em `DashboardComparisonView.tsx` — uma tarefa transversal, por isso não foi misturada com a entrega das novas abas.
6. **GeoParquet Explorer (4ª aba) não foi iniciado.** Nenhum arquivo desta seção do `docs/TODO_new.md` foi criado (`GeoParquetExplorer.tsx`, `FilterHistogram.tsx`, `FilterBoxplot.tsx`, `queryFilteredPixels()`). **O que falta:** é a Fase 3 completa — painel de filtros (modelo, experimento, variável, altura, faixa de batimetria, estado, distância da costa), a função `queryFilteredPixels(filters: FilterCriteria): FilteredAggregates` em `pixelQuery.ts` (filtra o array `records` já carregado e agrega estatísticas pré-computadas, sem calcular nenhum valor físico localmente), e os 4 gráficos (histograma, boxplot, scatter, perfil comparativo) — todo o comportamento já está detalhado em `docs/TODO_new.md` → "GeoParquet Explorer tab".

### Testes novos — `tests/e2e/07-dashboard-comparison.spec.ts`

| Teste | O que valida |
|---|---|
| T44 | As 3 abas internas aparecem; clicar alterna a aba ativa e o painel visível |
| T45 | Compare Experiments: selecionar 2 pares WRF renderiza os 5 gráficos com 2 traços, sem erro de console |
| T46 | Compare Experiments: seleção é limitada a 3 pares (checkboxes extras ficam desabilitados) |
| T47 | Compare Models: WRF traz dados reais e MPAS mostra "sem dados disponíveis", sem erro de console |
| T48 | Alternar para outra aba principal e voltar preserva a seleção de pares (estado não é perdido) |

### Arquivos modificados

`src/components/DashboardView.tsx`, `src/components/DashboardComparisonView.tsx` (novo), `src/components/MiniMap.tsx`, `src/components/MapView.tsx`, `src/lib/pixelQuery.ts`, `src/lib/dashboardChartConstants.ts` (novo), `src/App.css`, `src/i18n/pt-BR.ts`, `tests/e2e/07-dashboard-comparison.spec.ts` (novo)

---

## ✅ f01 (Fase 3) — GeoParquet Explorer (4ª aba) — 2026-07-04

> **Status:** Implementado e validado (`pnpm test` — 57 passed). Escopo completo em `docs/TODO_new.md` → "GeoParquet Explorer (4th dashboard tab)". Esta é a última fase pendente do `f01`; não há mais nenhuma seção do escopo original em aberto.

### Itens concluídos

| Item | Resolução |
|---|---|
| 4ª aba interna do Dashboard | `GeoParquetExplorer.tsx` (novo) adicionado à barra de abas internas de `DashboardView.tsx`; fica montado simultaneamente com as outras 3 (alternância via CSS `display`, mesmo padrão) |
| Painel de filtros | Modelo, Experimento, Variável, Altura (`dv-select`, reaproveitando o layout de filtros já usado nas outras abas); checkboxes de Batimetria (3 faixas) e Estado (17 estados costeiros, de `COASTAL_STATES`); dois `<input type="range">` sobrepostos para a distância da costa (0–400 nm, gap mínimo de 10 nm reforçado em `handleDistMinChange`/`handleDistMaxChange`) |
| Consulta via colunas pré-computadas, sem cálculo físico local | Nova `queryFilteredPixels(filters: FilterCriteria): FilteredAggregates` em `pixelQuery.ts` — filtra o array `records` já carregado por state/bathy_zone/distance e agrega apenas colunas existentes (`{variable}{height}_ANNUAL_mean`, `profile_means`/`wpd_profile_means`); a única aritmética local é média/desvio/mediana/histograma sobre esses valores já prontos |
| "Aplicar Filtros" — filtros não são aplicados a cada mudança | Nenhum `useEffect` reage a mudanças nos seletores; só o clique em "Aplicar Filtros" (`handleApply`) lê o estado atual, chama `loadParquet` e `queryFilteredPixels`, e só então atualiza `appliedFilters`/`result` — trocar um filtro sem clicar não altera os gráficos exibidos (`T52`) |
| Cache em memória por fingerprint | `cacheRef` (`Map<string, FilteredAggregates>`) chaveado por `JSON.stringify` dos filtros normalizados (arrays de state/bathy ordenados) — reaplica os mesmos filtros sem reconsultar `records` |
| Estatísticas agregadas | Barra de chips com Média, Mediana, Desvio Padrão, Mín, Máx e CV (`gpe-stats-bar`) |
| Histograma | 20 bins fixos (0–20 m/s para `ws`, 0–1500 W/m² para `wpd`), eixo X com faixas fixas |
| Boxplot por Estado / por Batimetria | Um box por categoria com pixels no conjunto filtrado; cada um só renderiza quando o respectivo filtro (Estado ou Batimetria) **não** está ativo — caso contrário mostra um card com a explicação (`chart-empty`) |
| Scatter distância × média + tendência | Pontos + reta de regressão linear simples (mínimos quadrados, calculada localmente — permitido pelo requisito, que só proíbe cálculo de grandezas físicas) |
| Perfil vertical com banda de incerteza | Médias por altura do conjunto filtrado (a partir de `profile_means`/`wpd_profile_means` por pixel) com barras de erro (`error_x`) = desvio padrão entre pixels |
| Paleta e eixos fixos | Reaproveita `CHART_COLORS` (Okabe-Ito) e os mesmos limites de eixo especificados no `docs/TODO_new.md` para esta aba |
| Sem re-render em mudança não relacionada | Filtros vivem em estado local do componente; `result`/`appliedFilters` só mudam dentro de `handleApply`; `histogramTrace`/`regression` usam `useMemo` |

### Bug pré-existente corrigido — título dos gráficos Plotly não aparecia em nenhuma aba

Ao inspecionar visualmente a nova aba, nenhum `<Plot>` do projeto (Visão Simples, Compare Experiments, Compare Models e o novo Explorer) renderizava o título principal do gráfico — só os títulos de eixo apareciam. Causa: `layout.title` era passado como string simples (ex. `` title: `Média Sazonal — ...` `` ou `title: 'Perfil Vertical — ...'`), enquanto os eixos já usavam a forma de objeto (`title: { text: '...' }`); na versão do `plotly.js` instalada (3.7.0) só a forma de objeto é renderizada para o título principal. **Correção:** todas as 15 ocorrências de `layout.title` em `DashboardView.tsx`, `DashboardComparisonView.tsx` e `GeoParquetExplorer.tsx` foram convertidas para `title: { text: ... }`. Validado visualmente (screenshot com `.gtitle` populado) nas 4 abas; nenhum teste E2E precisou mudar (nenhum deles fazia asserção sobre texto de título).

### O que não foi implementado (limitações) e o que falta para implementar

1. **MPAS continua sem nenhum dado publicado** (mesma limitação das Fases 1 e 2). Selecionar Modelo=MPAS no Explorer e clicar "Aplicar Filtros" retorna 0 pixels (guard de `queryFilteredPixels` contra o par não carregado), mostrando a mensagem de "nenhum pixel encontrado". **O que falta:** publicar os dados, sem mudança de código.
2. **A coluna `distance_nm` não existe nos arquivos GeoParquet reais** — `pixelQuery.ts` já tratava sua ausência com fallback `?? 0` (implementado na Fase 1), então todo pixel real tem `distance_nm = 0`. Isso tornava o filtro de "Distância da Costa" e o gráfico de dispersão funcionalmente inertes (todos os pontos caindo em x=0; a reta de regressão degenerava e não era desenhada, `den === 0`) — não é um bug de código, é uma limitação do dado publicado. **Mitigado na Fase 3.5:** o filtro fica desabilitado (com tooltip) e o scatter mostra um placeholder explícito em vez do gráfico degenerado (`hasRealDistanceData()` em `pixelQuery.ts`). **O que falta de verdade:** a pipeline de geração do GeoParquet precisa calcular e escrever `distance_nm` por pixel (distância até a linha de costa mais próxima); nenhuma mudança de código de consumo será necessária além de remover a mitigação de UI quando a coluna existir.
3. **A variável `wpd` (densidade de potência) não existe nos arquivos reais** — só há colunas `ws10_ANNUAL_*`/`ws100_ANNUAL_*` e `profile_means` (sem `wpd_profile_means`) nos parquets publicados atualmente. Selecionar Variável=Densidade de Potência retorna 0 pixels. Mesma limitação de dado (não de código) já presente nas Fases 1/2 para os gráficos WPD da Visão Simples/Compare. **O que falta:** publicar as colunas `wpd*` no pipeline de geração do GeoParquet.
4. **Alturas 50/150/200 m não têm colunas `ws{h}_ANNUAL_mean` nos arquivos reais** (só 10 e 100 m existem hoje) — mesma limitação de dado, não de código; selecionar essas alturas retorna 0 pixels no Explorer, igual ao comportamento (silencioso, sem erro) já existente nas outras abas para Weibull/altura fora de 10/100m.
5. **Faixas de batimetria reais divergem do mockup do `docs/TODO_new.md`.** O ASCII mockup sugeria checkboxes "0–20m, 20–50m, 50–100m, 100m+"; os valores de `bathy_zone` de fato presentes no GeoParquet são só `0_20`, `20_50`, `50_100` (sem uma categoria "100+"/além da plataforma) — confirmado inspecionando os arquivos publicados. O Explorer usa esses 3 valores reais (`BATHY_ZONE_OPTIONS` em `dashboardChartConstants.ts`) em vez de inventar uma 4ª opção sem dado correspondente.
6. **Slider de distância dual-handle simplificado.** O mockup mostra um único trilho com dois "puxadores" (`[●────●───]`). A implementação usa dois `<input type="range">` sobrepostos (mín/máx), sem uma faixa colorida única entre os dois — funcionalmente equivalente (define um intervalo com gap mínimo de 10 nm), mas visualmente mais simples que um componente de slider de faixa dupla customizado. **O que falta, se o visual do mockup for necessário:** um componente de dual-range com trilho preenchido entre os dois "thumbs" (CSS puro é possível, mas exige mais markup/JS do que os dois `<input type="range">` padrão do HTML).
7. **Boxplot por Estado e por Batimetria são exibidos de forma independente**, cada um com sua própria condição de visibilidade — e não um único chart card que troca entre os dois conforme qual filtro está inativo, como o mockup (com só 4 caixas de gráfico) sugere visualmente. Essa foi uma escolha deliberada: os critérios de aceite do `docs/TODO_new.md` listam "Boxplot by state" e "Boxplot by bathy zone" como dois itens distintos, cada um com sua própria condição — a leitura literal dos critérios (2 gráficos) foi priorizada sobre a contagem de caixas do mockup ASCII (ilustrativo).
8. **Sem exportação de CSV.** O mockup do `docs/TODO_new.md` inclui um botão "📥 Exportar CSV dos resultados", mas nenhum item da lista de critérios de aceite ("Acceptance criteria" → GeoParquet Explorer) pede essa funcionalidade — não foi implementada. **O que falta, se desejado:** um botão que serialize `result.values`/`result.distances`/`result.byState` como CSV e dispare um download via Blob/`URL.createObjectURL`, sem depender de nenhum pacote novo.
9. **Consulta ainda é single-slot (empresta e devolve o parquet global), como nas Fases 1/2.** `handleApply` chama `loadParquet(dataset, model)`, consulta, e depois restaura o par globalmente selecionado (`loadParquet(currentDataset, currentModel)`) — mesmo padrão de "emprestar e devolver" já usado em `DashboardComparisonView.tsx`. Isso significa que trocar de Modelo/Experimento no Explorer e clicar "Aplicar Filtros" momentaneamente troca o slot de memória usado pelo clique no mapa também, embora seja restaurado ao final. **O que falta:** mesma refatoração multi-slot já apontada como pendente na Fase 2, que beneficiaria também esta aba (evitaria a troca temporária do slot global).
10. **Títulos dos 5 gráficos usam `t()`, mas rótulos de eixo continuam hardcoded em pt-BR** — ex. `t('geoparquet_explorer.charts.histogram_title')` é usado no título, mas o eixo Y do histograma (`'Nº de pixels'`) e o eixo X do scatter (`'Distância da Costa (nm)'`) são strings fixas. Mesma limitação estrutural já registrada nas Fases 1/2 (depende de `f06` para fazer sentido converter tudo, já que não há troca de idioma real ainda).

### Testes novos — `tests/e2e/08-geoparquet-explorer.spec.ts`

| Teste | O que valida |
|---|---|
| T49 | A aba aparece e o painel de filtros mostra Modelo, Experimento, Variável, Altura, 3 checkboxes de Batimetria, 17 checkboxes de Estado e os 2 sliders de distância |
| T50 | "Aplicar Filtros" consulta dados reais (WRF ERA5 Histórico, sem trocar nenhum seletor) — 30773 pixels, 6 chips de estatística, 5 gráficos, nenhum boxplot oculto, sem erro de console |
| T51 | Filtrar por Estado=BA reduz a contagem para 588 pixels e oculta o boxplot por Estado (mostra o card de explicação) |
| T52 | Marcar um filtro sem clicar em "Aplicar Filtros" não altera a contagem/gráficos exibidos; só o clique subsequente aplica |
| T53 | Alternar para outra aba principal e voltar preserva o filtro marcado e o resultado já aplicado |

### Deviação pontual em testes existentes (mesmo padrão já registrado na Fase 2 para o `T38`)

A 4ª aba adiciona um 4º `.dv-tab-panel` e um 2º seletor "Modelo"/"Experimento" ainda montado no DOM (mesmo padrão das outras abas) — isso quebrou duas asserções pré-existentes por violação de strict-mode/contagem, corrigidas nesta fase:
- `T39` (`tests/e2e/06-dashboard-controls.spec.ts`): locator do select de Modelo escopado ao primeiro `.dv-tab-panel` (mesmo ajuste já aplicado ao `T38` na Fase 2).
- `T44` (`tests/e2e/07-dashboard-comparison.spec.ts`): contagem esperada de `.dv-inner-tab-btn` atualizada de 3 para 4.

### Arquivos modificados

`src/components/DashboardView.tsx`, `src/components/DashboardComparisonView.tsx`, `src/components/GeoParquetExplorer.tsx` (novo), `src/lib/pixelQuery.ts`, `src/lib/dashboardChartConstants.ts`, `src/App.css`, `src/i18n/pt-BR.ts`, `tests/e2e/06-dashboard-controls.spec.ts`, `tests/e2e/07-dashboard-comparison.spec.ts`, `tests/e2e/08-geoparquet-explorer.spec.ts` (novo)

---

## ✅ f01 (Fase 3.1) — Correção de nomenclatura Weibull/Wind Rose (bug pré-merge, TOFIX.md) — 2026-07-05

> **Status:** Implementado e validado (`pnpm test` — 60 passed). Plano completo em `docs/TOFIX.md` (removido após esta entrega).

### Bug pré-existente corrigido — colunas Weibull/Wind Rose lidas com o nome errado

O GeoParquet real (WRF) grava as colunas de Weibull e rosa dos ventos com sufixo `m` (`weibull_10m`, `weibull_100m`, `wind_rose_100m`), mas `pixelQuery.ts` lia essas colunas sem o sufixo (`weibull_10`, `wind_rose_100`). O acesso retornava `undefined` → fallback `null` — os dados existiam no arquivo mas nunca chegavam à UI, em qualquer aba que passasse por `queryDashboardLocation`/`queryNearest` (Visão Simples, Comparar Experimentos, Comparar Modelos). **Correção**, toda em `src/lib/pixelQuery.ts`:
- Interface `RawPixel`: os 5 campos `weibull_10`/`50`/`100`/`150`/`200` renomeados para `weibull_10m`/`50m`/`100m`/`150m`/`200m`.
- Inicialização e leitura do ANNUAL em `loadParquet`: mesmas 5 chaves atualizadas na atribuição a partir da linha do Arrow.
- `buildWeibullRecord` (não estava no relato original do bug, mas é a mesma causa): montava a chave de leitura como `` `weibull_${h}` `` a partir do `RawPixel` — sem ajustar para `` `weibull_${h}m` `` aqui, `queryNearest`/`queryDashboardLocation` continuariam retornando `null` mesmo com os itens acima corrigidos.
- Chave da wind rose: `` `wind_rose_${h}` `` → `` `wind_rose_${h}m` ``.

**GeoParquet Explorer não foi afetado** por este bug — `queryFilteredPixels` só agrega colunas `ws*`/`wpd*`, nunca `weibull_*`/`wind_rose_*`; foi incluído apenas na regressão manual pós-fix, sem mudança de código.

Confirmado via inspeção direta do schema real (`pyarrow`) que WRF (`era5_atlas`, `hist`, `ssp2-4.5`, `ssp5-8.5`) publica **apenas** `weibull_10m`/`weibull_100m`/`wind_rose_100m` — não há `weibull_50m/150m/200m` nem `wind_rose_10m` nos arquivos atuais (mesma limitação de dado já registrada nas Fases 1–3 para outras alturas/variáveis).

### Validação visual manual (pós-fix, com dado real)

Rodado localmente contra o parquet real (WRF, Histórico, lat=-10/lon=-35): Weibull exibe `k=4.41, c=7.85` (100m) e `k=4.74, c=7.01` (10m); rosa dos ventos preenchida em 100m (vazia em 10m — limitação de dado, sem erro de console); Comparar Experimentos (Histórico + SSP2-4.5 Futuro) mostra 2 curvas Weibull reais e distintas (`k=4.41,c=7.85` e `k=5.20,c=8.46`). Nenhum `console.error` observado em nenhum dos passos.

### Testes novos — cobrindo a lacuna de conteúdo (não só contagem/visibilidade)

Adicionado `data-testid` (`chart-weibull`, `chart-windrose`, `chart-seasonal`) nos `chart-card` de `DashboardView.tsx` e `DashboardComparisonView.tsx`, para asserções não dependerem da estrutura SVG interna do Plotly.

| Teste | Arquivo | O que valida |
|---|---|---|
| T54 | `06-dashboard-controls.spec.ts` | Visão Simples: `chart-weibull` recebe um trace cujo `name` contém `k=X.XX, c=X.XX` com dado real, nas alturas 10m e 100m |
| T55 | `06-dashboard-controls.spec.ts` | Visão Simples: `chart-windrose` (100m) tem ao menos um setor com frequência (`r`) > 0 |
| T56 | `07-dashboard-comparison.spec.ts` | Comparar Experimentos: `chart-weibull` recebe 2 traces (Histórico + SSP2-4.5 Futuro), ambos com `k=/c=` real na legenda |

Não foi criado um novo `09-*.spec.ts` — são extensões de contextos já cobertos (regra do `CLAUDE.md`). Nenhuma asserção nova foi adicionada ao GeoParquet Explorer (`08-*.spec.ts`): como o bug não o afeta, os testes T49–T53 já existentes já cobrem a regressão.

**Nota de implementação dos testes:** `handleManualAdd` (Visão Simples) só aceita um pino se `isLoaded()` já for `true` — mas o parquet inicial só é buscado ao clicar no mapa ou ao trocar Modelo/Experimento (`MapView.tsx`), nunca automaticamente no mount, mesmo com o `MapView` sempre montado atrás da aba Dashboard. T54/T55 trocam o Experimento no `beforeEach` (dispara o carregamento) e usam um retry-click (`expect(...).toPass()`) até o pino ser aceito, evitando depender do canvas real do MapLibre nos testes (fora do escopo de E2E, conforme `CLAUDE.md`).

### Arquivos modificados

`src/lib/pixelQuery.ts`, `src/components/DashboardView.tsx`, `src/components/DashboardComparisonView.tsx`, `tests/e2e/06-dashboard-controls.spec.ts`, `tests/e2e/07-dashboard-comparison.spec.ts`, `docs/TOFIX.md` (removido)

---

## ✅ f01 (Fase 3.2) — Checagem visual/interativa do Dashboard (4 abas) — 2026-07-05

> **Status:** Implementado e validado (`pnpm test` — 67 passed). Varredura visual manual (Playwright fora do runner de testes, contra dados reais) pelas 4 abas do Dashboard, em 3 breakpoints, procurando bugs que os testes de contagem/visibilidade não pegam. 4 bugs reais encontrados e corrigidos; nenhum estava relacionado ao fix da Fase 3.1.

### Bug 1 — "Remove All" (Visão Simples) deixava 1 local para trás

`onClick={() => pinnedLocations.forEach((_, i) => onRemoveLocation(i))}` chamava `onRemoveLocation(i)` com os índices originais (0,1,2) em sequência; como `handleRemoveLocation` em `App.tsx` faz `setPinnedLocations(prev => prev.filter((_, idx) => idx !== idx_alvo))`, remover em ordem ascendente sobre um array que encolhe a cada chamada sempre deixava o item do meio para trás (testado: 3 pinos → "Remove All" → sobrava 1). **Correção:** `DashboardView.tsx` agora itera em ordem decrescente (`for (let i = pinnedLocations.length - 1; i >= 0; i--) onRemoveLocation(i)`), removendo cada item antes que o shift do array afete os índices restantes.

### Bug 2 — Rejection não tratada ao carregar a camada de Batimetria (dispara em toda sessão)

`MapView.tsx` fica sempre montado atrás da aba Dashboard (mesmo padrão já documentado na Fase 3.1 para o parquet) e busca a camada de batimetria padrão assim que monta. `BATHY_FILES` apontava para `/data/shp/*.geojson` — caminho que nunca existiu (os arquivos reais estão em `/data/bathymetry/batimetria_*_cured.geojson`, confirmado inspecionando `public/data/bathymetry/`) — e a camada padrão em `App.tsx` (`bathyLayer = 'mn_zee_nacional'`) não tem nenhum arquivo publicado (não é um problema de caminho: essa camada de limite de ZEE simplesmente nunca foi entregue). O `fetch(file).then(r => r.json())` não checava `r.ok`/content-type, então o fallback SPA do Vite (200 + HTML) quebrava o `r.json()` com `"Unexpected token '<'... is not valid JSON"` como uma **rejection não tratada** — invisível para `page.on('console')` (por isso nenhum teste existente pegou), mas visível para `page.on('pageerror')`, e portanto visível como erro real no console do navegador de qualquer usuário, em toda sessão, antes de qualquer interação. **Correção** em `src/components/MapView.tsx`:
- 4 dos 6 caminhos de `BATHY_FILES` corrigidos para os arquivos reais (`bathy_0_100_nacional/estadual`, `bathy_0_20_50_75_100_nacional/estadual`).
- `mn_zee_nacional`/`mn_zee_estadual` continuam sem arquivo real (mesma classe de limitação do MPAS) — ficaram documentados como tal no código.
- O `fetch` ganhou o mesmo guard de `r.ok`/content-type já usado em `pixelQuery.ts`, com `.catch(console.warn)` em vez de deixar a rejection escapar.
- `bathyLayer` padrão em `App.tsx` trocado de `'mn_zee_nacional'` (sem dado) para `'bathy_0_100_nacional'` (com dado real), para a sessão não iniciar já em cima de uma camada sem publicação.

### Bug 3 — Eixo Y do gráfico "Média Sazonal" sempre rotulado "Velocidade do Vento", mesmo com Variável = Densidade de Potência

Em `DashboardView.tsx` e `DashboardComparisonView.tsx`, o *título* do gráfico já usava `varLabel(dashboardVar).label` corretamente (ex. "Média Sazonal — Dens. Potência 100m"), mas o `yaxis.title` estava hardcoded como `` `Velocidade do Vento (${varUnit})` `` — ao trocar a Variável para WPD, o eixo Y continuava dizendo "Velocidade do Vento (W/m²)". `GeoParquetExplorer.tsx` já fazia isso corretamente (`varLabel(appliedVariable).label`), então os outros dois componentes ficaram inconsistentes com o padrão já estabelecido. **Correção:** ambos os `yaxis.title.text` trocados para `` `${varLabel(...).label} (${varUnit})` ``.

### Bug 4 — Rótulos "Variable"/"Height" em inglês na Visão Simples (as 3 outras abas já usavam `t()`)

As chaves `dashboard.filters.variable_label` (`"Variável"`) e `dashboard.filters.height_label` (`"Altura"`) já existiam em `src/i18n/pt-BR.ts` e já eram usadas por `DashboardComparisonView.tsx` e `GeoParquetExplorer.tsx`, mas `DashboardView.tsx` (Visão Simples) tinha ficado com `<label>Variable</label>`/`<label>Height</label>` hardcoded em inglês — a única das 4 abas nessa condição. **Correção:** as duas labels agora usam `t('dashboard.filters.variable_label')`/`t('dashboard.filters.height_label')`, igual às outras abas. (Os placeholders "Latitude"/"Longitude" e o texto do botão "+ Add Location" continuam em inglês nas 2 abas que os têm — Visão Simples e Comparar Experimentos/Modelos — de forma consistente entre si; isso é o mesmo item já registrado nas limitações da Fase 2 ("rótulos... ainda não usam `t()`"), não uma inconsistência nova, e não foi alterado aqui.)

### Bug 5 (CSS, mais grave) — Visão Simples inutilizável em mobile/tablet (≤900px)

A regra responsiva `@media (max-width: 900px) { .dv-sidebar { width: 100%; } }` foi escrita pensando em `.dv-main` (usado por Comparar Experimentos/Modelos), que na mesma regra também vira `flex-direction: column` — então "width:100%" do mini-mapa faz sentido (100% da coluna, depois de empilhar). A Visão Simples, porém, aninha `.dv-body` + `.dv-sidebar` diretamente sob `.dv-tab-panel` (não sob `.dv-main`), e `.dv-tab-panel` não tinha nenhuma regra correspondente — então em ≤900px o mini-mapa ficava com `width:100%` **enquanto o layout continuava em linha (row)**, espremendo `.dv-body` (filtros, Latitude/Longitude, "+ Add Location") para uma fatia de ~30px de largura, efetivamente invisível/inutilizável (confirmado via `getBoundingClientRect`: `.dv-body` renderizando com 32px de largura em 375px de viewport). Como `.dv-tab-panel` tem `overflow: hidden`, isso nunca aparecia como scroll horizontal — por isso passou despercebido pelos testes `T08` (que só cobrem a landing page, não o Dashboard). **Correção:** adicionado `.dv-tab-panel { flex-direction: column; }` na mesma media query — seguro para as outras 3 abas porque `.dv-compare`/`.gpe` (seus únicos filhos diretos de `.dv-tab-panel`) já têm `flex: 1`, preenchendo 100% de largura/altura independente da direção do flex do pai.

### Testes novos — cobrindo os 5 bugs (T57–T61)

| Teste | Arquivo | O que valida |
|---|---|---|
| T57 | `06-dashboard-controls.spec.ts` | Trocar a camada de Batimetria (ZEE Nacional → Plataforma Nacional → Subfaixas Nacional) não lança exceção não tratada (`page.on('pageerror')`) |
| T58 | `06-dashboard-controls.spec.ts` | Abrir o Dashboard direto (sem interação) não lança exceção não tratada — cobre o caso de toda sessão herdar a camada padrão quebrada |
| T59 | `06-dashboard-controls.spec.ts` | Fixar 3 locais e clicar "Remove All" remove os 3 (não deixa 1 para trás) |
| T60 | `03-responsiveness.spec.ts` | Dashboard sem scroll horizontal nas 4 abas, nos 3 breakpoints (375/768/1280) |
| T61 | `03-responsiveness.spec.ts` | Em mobile, o botão "+ Add Location" da Visão Simples renderiza com largura > 80px (não espremido a uma fatia) |

`T42`/`T43` (já existentes) ganharam também um listener de `page.on('pageerror')` além do de `console`, já que uma rejection não tratada (Bug 2) não aparece em `page.on('console')` — só em `pageerror`. Isso é o motivo pelo qual o Bug 2 nunca apareceu em nenhum teste anterior apesar de disparar em toda sessão.

### Arquivos modificados

`src/components/DashboardView.tsx`, `src/components/DashboardComparisonView.tsx`, `src/components/MapView.tsx`, `src/App.tsx`, `src/App.css`, `tests/e2e/06-dashboard-controls.spec.ts`, `tests/e2e/03-responsiveness.spec.ts`

---

## ✅ f01 (Fase 3.3) — Correções de UX/dados do Dashboard (TOFIX.md, categoria A) — 2026-07-07

> **Status:** Implementado e validado (`pnpm test` — 73 passed, `pnpm test:types` — 0 erros). Fecha a categoria A do `docs/TOFIX.md` (6 bugs de código bloqueando o merge) + o auto-load do parquet (item C2, promovido a correção por ser regressão de UX reportada com a auditoria).

### Itens concluídos (categoria A do TOFIX)

| Item | Resolução |
|---|---|
| **A1** — Pinned locations não atualizavam ao trocar experimento/modelo | Novo `useEffect([model, dataset])` em `App.tsx` re-consulta cada localização fixada com `queryDashboardLocation(lat, lon, model, datasetFolder(dataset))` e substitui o `pinnedLocations`. Snapshots com dado nulo (par sem publicação, ex. MPAS) preservam o pino anterior — trocar de par nunca apaga as coordenadas fixadas. Os gráficos de Weibull/rosa/perfil (que leem do snapshot da `loc`) passam a refletir o par atual, não mais o par do momento do clique. |
| **A2** — Boxplot por Estado ordenado por contagem decrescente | Nova constante `STATE_ORDER_NORTH_SOUTH` + `stateNorthSouthIndex()` em `cogCatalog.ts` (AP→RS). `GeoParquetExplorer.tsx` ordena `byState` por esse índice geográfico (memo `byStateOrdered`); `COASTAL_STATES` segue alfabético para o grid de checkboxes. Boxplot de Batimetria também ordenado por profundidade (`0_20`→`50_100`) via `byBathyOrdered`. |
| **A3** — Boxplot por Estado sumia com 1 estado e com 2+ | Lógica trocada de `=== 0` para `!== 1`: o boxplot aparece com 0 (todas as categorias) ou 2+ selecionados; some só com exatamente 1 (categoria única não faz sentido). Mesma regra para Batimetria. *(A doc do TOFIX sugeria `<= 1`, mas isso contradizia o próprio título "deveria exibir com 2+" — `!== 1` é a implementação que satisfaz o comportamento descrito e mantém o `T51` passando.)* |
| **A4** — Legenda "WRF — ERA5 (Loc N)" redundante | `locLabel` em `DashboardView.tsx` agora retorna só `Loc ${i+1}` — modelo/experimento/variável/altura já estão explícitos na barra de filtros acima. |
| **A5** — Modebar do Plotly desabilitada nos 15 gráficos | Nova constante compartilhada `PLOT_CONFIG` em `dashboardChartConstants.ts` (`displayModeBar: true`, `displaylogo: false`, remove `lasso2d`/`select2d`, `toImageButtonOptions` PNG 900×600). As 15 ocorrências de `config={{ displayModeBar: false, responsive: true }}` nos 3 componentes passaram a `config={PLOT_CONFIG}`. |
| **A6** — Precisão decimal excessiva no hover | `hoverformat: '.2f'` nos eixos de valor (velocidade do vento, densidade de potência) dos 3 componentes; `.4f` no eixo de densidade de probabilidade do Weibull; `.1f` no eixo de distância do scatter. |
| **Auto-load (C2)** — Dashboard só funcionava após clicar no mapa | Novo `useEffect` em `App.tsx` chama `loadParquet(datasetFolder(dataset), model)` ao entrar nas abas Map/Dashboard; `handleAddLocation` passa o par para `queryDashboardLocation` (carrega sob demanda); removido o bloqueio `isLoaded()` + mensagem "Click the map first" em `DashboardView.tsx`. |

### Testes novos — T62–T67

| Teste | Arquivo | O que valida |
|---|---|---|
| T62 | `08-geoparquet-explorer.spec.ts` | Boxplot por Estado reaparece com 2+ estados selecionados (A3) |
| T63 | `08-geoparquet-explorer.spec.ts` | Boxplot por Estado ordenado Norte→Sul — sequência de índices geográficos ascendente (A2) |
| T64 | `08-geoparquet-explorer.spec.ts` | Modebar habilitada: botão de download PNG presente, lasso/box-select ausentes (A5) |
| T65 | `06-dashboard-controls.spec.ts` | "+ Add Location" funciona sem clique prévio no mapa (auto-load do parquet) |
| T66 | `06-dashboard-controls.spec.ts` | Legenda dos gráficos usa só "Loc N" (A4) |
| T67 | `06-dashboard-controls.spec.ts` | Trocar experimento re-consulta os pinned locations, o pino persiste e não há erro de console (A1) |

**Validação manual (checklist TOFIX):** trocar experimento no Dashboard atualiza os pinned locations; boxplot por Estado com 0/1/2/3+ estados; modebar com zoom/download funcionando.

### Categoria B do TOFIX — limitações do pipeline de dados (não são bugs de código)

Os GeoParquet publicados em `public/data/geoparquet/wrf/*/season=annual/data.parquet` só contêm as colunas listadas no TOFIX (`profile_*`, `weibull_10m`/`weibull_100m`, `wind_rose_100m`, `ws10_*`/`ws100_*` por estação). O código já procura por todas as alturas/estações — **o dado é que não foi gerado**. Colunas ausentes a gerar no pipeline (registrado aqui para a versão final dos dados): `ws50/150/200_*`, todos os `wpd*_*`, `wpd_profile_means`, `weibull_50m/150m/200m`, `wind_rose_10m/50m/150m/200m`, `distance_nm`. Enquanto não existirem: média sazonal só em 10m/100m, densidade de potência inerte, Weibull só 10m/100m, rosa dos ventos só 100m, filtro/scatter de distância inertes.

### Arquivos modificados

`src/App.tsx`, `src/components/DashboardView.tsx`, `src/components/DashboardComparisonView.tsx`, `src/components/GeoParquetExplorer.tsx`, `src/lib/cogCatalog.ts`, `src/lib/dashboardChartConstants.ts`, `tests/e2e/06-dashboard-controls.spec.ts`, `tests/e2e/08-geoparquet-explorer.spec.ts`

---

## ✅ f01 (Fase 3.4) — Legendas/hover redundantes, gráfico órfão de WPD e filtro de distância (PR review) — 2026-07-07

> **Status:** Implementado e validado (`pnpm test` — 74 passed, `pnpm test:types` — 0 erros). Fecha 4 bugs reportados na revisão da PR do Dashboard (screenshots anotados nas abas "Comparar Experimentos" e "Explorador GeoParquet") + 1 melhoria de UX (botão de reset na Rosa dos Ventos) pedida em follow-up na mesma revisão.

### Itens concluídos

| Item | Resolução |
|---|---|
| **Legenda redundante nos subplots** | `showlegend: false` nos gráficos de Média Sazonal, Rosa dos Ventos e Perfil Vertical em `DashboardView.tsx` e `DashboardComparisonView.tsx` — a cor/nome de cada série já está na "legenda universal" (chips) acima do grid. O gráfico de Weibull mantém `showlegend: true`, pois seu nome de série carrega os parâmetros `k=`/`c=` (única informação sem duplicata em outro lugar da tela). |
| **Hover com "modelo–experimento–período–valor" demais para o tamanho do subplot** | Novas constantes `CHART_FONT` (`size: 12`, padronizado em todos os gráficos, antes variava entre 10/11) e `HOVER_LABEL_STYLE` (painel branco translúcido `rgba(255,255,255,0.92)`) em `dashboardChartConstants.ts`. Média Sazonal/Weibull usam `hovermode: 'x unified'`; os perfis verticais usam `hovermode: 'y unified'` (eixo compartilhado é a altura, não o valor). Cada traço ganhou `hovertemplate` só com o valor (`<extra></extra>` suprime o nome da série) — o hover agora mostra os valores empilhados verticalmente, coloridos por série, sem repetir o rótulo já visível na legenda/chips. Rosa dos Ventos (polar) não suporta hovermode unificado; manteve `closest` com hovertemplate reduzido (`setor: valor%`) e a caixa de hover tingida da cor do traço. Aplicado nas 4 abas do Dashboard, incluindo histograma/scatter/perfil do Explorador GeoParquet. |
| **Gráfico órfão "Perfil Vertical — Densidade de Potência"** | Removido de `DashboardView.tsx` (Visão Simples) e `DashboardComparisonView.tsx` (Comparar Experimentos/Modelos) — a categoria B do TOFIX (Fase 3.3) já registra que a coluna `wpd_profile_means` não é publicada em nenhum GeoParquet real, então o card só renderizava vazio. O Explorador GeoParquet não foi afetado: seu único card de perfil já é dinâmico por variável (`ws`/`wpd`), não duplicado. |
| **Eixo X do "Distância vs. Média" não acompanhava o filtro** | O `range` do eixo X e da linha de tendência estava fixo em `[0, DISTANCE_MAX_NM]` (0–400 nm) mesmo após aplicar um filtro de distância mais estreito, desperdiçando a maior parte do gráfico. Agora usa `appliedFilters.distanceMin/distanceMax`. |
| **Slider manual de distância trocado por checkboxes** | O slider de duas alças (`gpe-range-pair`) foi substituído por 3 checkboxes — `DISTANCE_ZONE_OPTIONS` em `dashboardChartConstants.ts` (0–12 nm / 0–20 nm / 0–200 nm, os limites oficiais de mar territorial/ZEE) — como uma 2ª coluna do `gpe-checkbox-panel`, no mesmo padrão visual da Batimetria. Como as faixas são aninhadas a partir de 0 (não disjuntas como Batimetria), marcar múltiplas apenas amplia o filtro até o maior limite selecionado (`distanceMaxFromZones`). |
| **Rosa dos Ventos sem forma de resetar o zoom** (follow-up) | O modebar padrão do Plotly só ganha botão de reset ("home") para subplots cartesian/geo/3d/mapbox — polar (`scatterpolar`) fica só com os botões de download e zoom, sem reset visível (dar zoom deixava o usuário preso, só dava pra voltar via double-click, um gesto não descoberto pela UI). Novo `WINDROSE_PLOT_CONFIG` em `dashboardChartConstants.ts`: reusa `PLOT_CONFIG` + um botão customizado ("Resetar zoom", ícone `home` do Plotly) que chama `Plotly.relayout(gd, {'polar.radialaxis.autorange': true})`. Usado só nos 2 gráficos de Rosa dos Ventos (`DashboardView.tsx`/`DashboardComparisonView.tsx`); as outras abas continuam com `PLOT_CONFIG`. Exigiu adicionar `plotly.js` como dependência direta do projeto — era só peerDependency do `react-plotly.js`, resolvida internamente por ele mas invisível para import direto do nosso código sob o layout estrito do pnpm. |

### Testes atualizados

| Teste | Arquivo | Mudança |
|---|---|---|
| T45 | `07-dashboard-comparison.spec.ts` | Contagem de `.chart-card` em Comparar Experimentos: 5 → 4 (removido o card de WPD) |
| T49 | `08-geoparquet-explorer.spec.ts` | Assert do slider (`.gpe-range-pair input[type="range"]`) trocado por assert da nova coluna de checkboxes "Distância da Costa" (3 opções) |
| T68 (novo) | `06-dashboard-controls.spec.ts` | Rosa dos Ventos: zoom via drag simulado + clique em "Resetar zoom" restaura `polar.radialaxis.range` ao autorange original |

### Arquivos modificados

`src/components/DashboardView.tsx`, `src/components/DashboardComparisonView.tsx`, `src/components/GeoParquetExplorer.tsx`, `src/lib/dashboardChartConstants.ts`, `src/App.css`, `package.json`, `pnpm-lock.yaml`, `tests/e2e/06-dashboard-controls.spec.ts`, `tests/e2e/07-dashboard-comparison.spec.ts`, `tests/e2e/08-geoparquet-explorer.spec.ts`

---

## ✅ f01 (Fase 3.5) — ERA5 duplicado, legenda ausente na Visão Simples e scatter de distância (docs/TOFIX.md) — 2026-07-12

> **Status:** Implementado e validado (`pnpm test` — 78 passed, `pnpm test:types` — 0 erros) + validação visual manual via dev server (screenshots dos 3 cenários, sem erro de console). Plano completo em `docs/TOFIX.md`.

### Itens concluídos

| Item | Resolução |
|---|---|
| **"ERA5 Reanálise (Presente)" e "(Histórico)" mostravam dado idêntico** | Causa raiz: `datasetFolder()` (`cogCatalog.ts`) remove o sufixo `_historico`/`_presente`/`_futuro` de qualquer `Dataset`, e as duas variantes de ERA5 colapsavam para a mesma (e única) pasta em disco, `ERA5_atlas/`. Como reanálise ERA5 é, por definição, um produto histórico (sem variante "presente" real), a opção `ERA5_atlas_presente` foi **removida** do `Dataset`, de `DATASETS` e de `DATASET_LABEL` em `cogCatalog.ts` — mantendo só "ERA5 Reanálise (Histórico)". |
| **Aba "Visão Simples" não indicava qual cor era qual localização** | Causa raiz: o chip de cada local fixado usava a classe CSS `.chip-state`, marcada no próprio código como `/* Dashboard Modal (dead, kept for reference) */` — cor de texto fixa, sem `border` real, ignorando a prop `COLORS[i]` passada via inline style. Trocado o markup em `DashboardView.tsx` para o padrão `dv-legend-chip`/`dv-legend-swatch` já usado (e funcional) nas abas de comparação, com o rótulo `locLabel(loc, i)` ("Loc N") batendo com os nomes usados nos traços do gráfico de Weibull. Classes mortas `.chip-state` e `.dv-chip` (órfã, confirmada via grep) removidas de `App.css`. |
| **Scatter "Distância vs. Média" com todos os pontos em X=0** | Causa raiz confirmada via schema real (`pyarrow`): a coluna `distance_nm` **não existe** em nenhum GeoParquet publicado — todo pixel cai no fallback `?? 0` em `pixelQuery.ts`. Não é bug de código (filtro e gráfico já leem a coluna certa); é limitação do dado, já registrada no TOFIX/TODO. Mitigação de UI: novo helper `hasRealDistanceData()` em `pixelQuery.ts`; os 3 checkboxes de "Distância da Costa" em `GeoParquetExplorer.tsx` ficam desabilitados com tooltip, e o card do scatter mostra um placeholder (`chart-card chart-empty`, mesmo padrão dos boxplots condicionais) em vez do gráfico degenerado. Autorreversível: quando o pipeline publicar `distance_nm` real, `hasRealDistanceData()` passa a retornar `true` e a UI volta a mostrar o gráfico sem nenhuma mudança de código adicional. |

### Achado colateral (registrado, fora do escopo desta rodada)

A mesma função `datasetFolder()` também colapsa `SSP2-4.5_presente`/`SSP2-4.5_futuro` (e o par `SSP5-8.5`) para a única pasta por cenário existente em disco — confirmado via `find` e via schema do parquet (nenhuma coluna distingue período presente/futuro). Diferente do caso ERA5, aqui a duplicidade é indevida: presente e futuro de um mesmo cenário climático deveriam ter dado real distinto. **Não corrigido nesta rodada** (depende do pipeline publicar dois períodos reais); fica para uma decisão de priorização futura, com a mesma mitigação de UI (aviso) como opção de curto prazo.

### Testes novos — T69–T72

| Teste | Arquivo | O que valida |
|---|---|---|
| T69 | `08-geoparquet-explorer.spec.ts` | Checkboxes de "Distância da Costa" aparecem desabilitados com tooltip de dado indisponível |
| T70 | `08-geoparquet-explorer.spec.ts` | Card do scatter "Distância vs. Média" mostra placeholder em vez de pontos em X=0 |
| T71 | `06-dashboard-controls.spec.ts` | Seletor de Experimento não oferece mais "ERA5 Reanálise (Presente)" |
| T72 | `06-dashboard-controls.spec.ts` | Chips da Visão Simples mostram swatch colorido + rótulo "Loc N" por local fixado, com cores distintas |

### Testes existentes ajustados (mecânico, mesma cobertura)

`.dv-chips .chip-state` → `.dv-chips .dv-legend-chip` em 7 ocorrências (T54, T55, T59, T65, T66, T67, T68); T50/T51/T62 (`08-geoparquet-explorer.spec.ts`) tiveram a contagem esperada de `.chart-card.chart-empty` ajustada em +1 (o novo placeholder do scatter, sempre presente hoje) e passaram a checar o texto de cada placeholder especificamente, para não confundir o placeholder de Estado/Batimetria com o de distância.

### Arquivos modificados

`src/lib/cogCatalog.ts`, `src/lib/pixelQuery.ts`, `src/components/DashboardView.tsx`, `src/components/GeoParquetExplorer.tsx`, `src/i18n/pt-BR.ts`, `src/App.css`, `tests/e2e/06-dashboard-controls.spec.ts`, `tests/e2e/08-geoparquet-explorer.spec.ts`, `docs/TOFIX.md`

---

## ✅ f02 — Gráficos do Dashboard: Weibull maior, Perfil WPD e Heatmap Direcional — 2026-07-20

> **Status:** Implementado e validado (`pnpm test` — 83 passed, `pnpm test:types` — 0 erros). Escopo completo no `TODO.md` (raiz do projeto, ticket `f02 — dashboard-charts`).

### Itens concluídos

| Item | Resolução |
|---|---|
| **Weibull chart maior no Pixel Info** | `WeibullChart.tsx` (Chart.js, usado no `PixelInfoPanel`): altura do canvas `120` → `200`. Eixo X passou a gerar sempre o range fixo `[0, 30]` m/s (antes ia até `c*3`, variável por localização); eixo Y fixo em `[0, 0.3]`. Legenda escondida (`legend: { display: false }`) — só há 1 traço por instância do componente, o `k=`/`c=` já aparece no título e nas linhas acima do gráfico. |
| **Perfil Vertical — Densidade de Potência (WPD)** | Novo `variant?: 'ws' \| 'wpd'` em `ProfileChart.tsx` (mesmo componente Chart.js do perfil de velocidade, parametrizado por cor/eixo/range — evita duplicar o componente). Renderizado no `PixelInfoPanel.tsx` logo abaixo do perfil de velocidade, e como novo `chart-card` (`data-testid="chart-wpd-profile"`) na Visão Simples do `DashboardView.tsx`, com o mesmo `wsProfileData`→`wpdProfileData` (`useMemo` análogo, lendo `loc.wpd_profile_means`). **Este gráfico já existiu e foi removido na Fase 3.4** por renderizar sempre vazio (`wpd_profile_means` não é publicado em nenhum GeoParquet real, categoria B do TOFIX/Fase 3.3) — desta vez ele volta acoplado a uma checagem de dado real (`hasWpdProfileData`) que mostra `chart-empty` com mensagem em vez do gráfico degenerado, então não repete o bug: hoje mostra corretamente o estado vazio; assim que o pipeline publicar a coluna, passa a mostrar o gráfico sem nenhuma mudança de código. |
| **Distribuição Direcional (heatmap ws/wpd × setor)** | Novo componente `DirectionalHeatmap.tsx` — tabela HTML estilizada (não Plotly/Chart.js, para não pesar o bundle) com 16 linhas (setores de `SECTOR_LABELS`) × N colunas (bins de velocidade/potência, inferidos dividindo o tamanho do array plano por 16 — a única forma possível já que o array não carrega metadado de nº de bins) e coloração de célula proporcional ao valor (paleta Okabe-Ito azul→vermelho). Usa `loc.heatmap['{variável}{altura}_heatmap']` (já populado por `queryDashboardLocation`) — extraído também para `queryNearest()`/`PixelDataSummary` (não existia lá antes) para alimentar a seção "Directional Distribution" do `PixelInfoPanel`. Um card por localização fixada na Visão Simples (`data-testid="chart-heatmap"`, `chart-card--wide` ocupando as 2 colunas do grid). Mesma limitação de dado do item anterior: nenhum GeoParquet real publica colunas `*_heatmap` hoje, então o estado vazio é o que aparece na prática — confirmado visualmente via dev server. |
| **Ranges fixos de eixo (não autoescalam por localização)** | Alinhados aos valores do ticket: Weibull `x[0,30]`/`y[0,0.3]` (acima), Perfil WS `x[0,20]` (era `[0,25]` no Plotly da Visão Simples e no Chart.js do Pixel Info), Perfil WPD `x[0,1500]`, Média Sazonal `y[0,20]` para `ws` / `y[0,1200]` para `wpd` (eram `[0,25]`/`[0,1500]`). Eixo Y dos perfis (altura) continua com os ticks fixos `10/50/100/150/200` já existentes (`HEIGHT_TICKVALS`/`profileYAxis`), que já eram fixos antes do f02. |
| **i18n dos textos novos** | Novas chaves `dashboard.chart.*` em `pt-BR.ts` (títulos, eixos, unidades, mensagens de estado vazio) — usadas via `t()` real (já mergeado desde `f06`) em `WeibullChart.tsx`, `ProfileChart.tsx`, `DirectionalHeatmap.tsx` e nos 2 novos cards Plotly do `DashboardView.tsx`. Os cards Plotly pré-existentes (Média Sazonal, Weibull, Rosa dos Ventos) mantiveram os textos hardcoded em pt-BR já registrados como limitação nas Fases 1/2 (fora do escopo do `f02`, que listava só os arquivos acima). |
| **Remoção da non-null assertion** | `PixelInfoPanel.tsx`: `data.weibull[10]!.k`/`!.c` → `data.weibull[10]?.k ?? null`/`?.c ?? null`, igual ao padrão já usado para `weibull[100]` na mesma seção. |

### Testes novos — T73–T77

| Teste | Arquivo | O que valida |
|---|---|---|
| T73 | `09-dashboard-charts.spec.ts` | Card de Perfil WPD aparece na Visão Simples com estado vazio (dado não publicado) |
| T74 | `09-dashboard-charts.spec.ts` | Card de heatmap aparece 1x por local fixado (rótulo "Loc N"), com estado vazio |
| T75 | `09-dashboard-charts.spec.ts` | Média Sazonal: eixo Y fixo em `[0, 20]` m/s |
| T76 | `09-dashboard-charts.spec.ts` | Perfil Vertical (Velocidade): eixo X fixo em `[0, 20]` m/s |
| T77 | `09-dashboard-charts.spec.ts` | Nenhum erro de console ao renderizar os 2 novos cards e trocar variável/altura |

**Validação manual (checklist do ticket):** verificado via dev server + clique real no mapa (screenshot) — Pixel Info mostra o perfil WS, a seção "Vertical Profile — Power Density" (estado vazio em pt-BR) e "Directional Distribution" (estado vazio em pt-BR) abaixo do Weibull, agora visivelmente maior (2 instâncias, 100m e 10m); nenhum erro de console. Lógica de divisão do heatmap (16 setores × N bins) verificada isoladamente para vários tamanhos de array (16/32/48/160 → ok; 17/0 → estado vazio, como esperado).

### Observação — mesma limitação de pipeline das fases anteriores

Os dois recursos novos mais visíveis (Perfil WPD e Heatmap Direcional) dependem de colunas que a categoria B do TOFIX (Fase 3.3) já registra como ausentes em todo GeoParquet publicado hoje (`wpd_profile_means`, e agora também `*_heatmap`, que nem chegou a ser listada por ainda não ter sido um requisito). Não é um bug desta entrega — os componentes foram construídos para mostrar o estado vazio corretamente enquanto isso, e passam a exibir dado real automaticamente assim que o pipeline publicar essas colunas, sem qualquer mudança de código adicional.

### Arquivos modificados

`src/lib/pixelQuery.ts`, `src/components/WeibullChart.tsx`, `src/components/ProfileChart.tsx`, `src/components/DirectionalHeatmap.tsx` (novo), `src/components/PixelInfoPanel.tsx`, `src/components/DashboardView.tsx`, `src/i18n/pt-BR.ts`, `src/App.css`, `tests/e2e/09-dashboard-charts.spec.ts` (novo)

---

## ✅ f03 — UI Enhancements: loading do COG, export CSV/PNG, tela cheia, rosa dos ventos colorida, novos basemaps — 2026-07-20

> **Status:** Implementado e validado (`pnpm test` — 91 passed, `pnpm test:types` — 0 erros novos). Escopo completo no `TODO.md` (raiz do projeto, ticket `f03 — ui-enhancements`).

### Itens concluídos

| Item | Resolução |
|---|---|
| **Loading state do COG** | Novo estado `cogLoading` em `MapView.tsx` (`true` durante `drawCog`, em `try/finally` guardado por `!signal.aborted` para não esconder o spinner de uma chamada mais nova que já abortou a anterior). Renderizado como `.cog-loading` — badge pequeno e centralizado no topo do mapa, `pointer-events: none` (não bloqueia pan/zoom/clique), com spinner CSS puro (`@keyframes cog-spin`, sem GIF/SVG externo). |
| **Remoção do `console.log` de debug** | `pixelQuery.ts:267` (`"PixelQuery: loaded..."`) trocado para `console.debug`, igual ao padrão já usado nos demais logs de diagnóstico do módulo. |
| **Export CSV do Dashboard** | Botão "⬇ Download CSV" em `.dv-filter-bar` (Visão Simples), desabilitado sem locais fixados. Gera 1 linha por combinação `local × sazonalidade (5) × variável (ws/wpd) × altura (5)` = 50 linhas por local fixado, usando `seasonStat()` (já existente em `pixelQuery.ts`, lê do snapshot `DashboardLocationData` — não do singleton global) para não misturar dado de pares diferentes. Valores ausentes/nulos gravados como string vazia (não `"null"`/`"NaN"`). `Blob` + `URL.createObjectURL` + `<a>` oculto — sem dependência nova. Nome do arquivo: `webgis-dashboard-{YYYY-MM-DD}.csv`. |
| **Fullscreen dos gráficos** | Novo componente local `ChartCard` (em `DashboardView.tsx`) encapsula o botão de expandir/restaurar (⛶/✕) e a classe `chart-card--fullscreen` (position fixed + backdrop `.chart-fullscreen-backdrop` com `z-index` acima do resto da UI) — usado pelos 6 `chart-card` da Visão Simples (Sazonal, Weibull, Rosa dos Ventos, Perfil WS, Perfil WPD, Heatmap × N locais). Segundo clique no mesmo botão, clique no backdrop ou tecla `Escape` (listener condicional em `useEffect`) restauram o layout. A altura do `<Plot>` do card expandido passa a ser calculada a partir de `window.innerHeight` (Plotly não aceita altura em `vh`) e um `resize` sintético é disparado (`requestAnimationFrame`) para o `useResizeHandler` do `react-plotly.js` recalcular a largura. |
| **Rosa dos Ventos colorida por velocidade** | Trace trocado de `scatterpolar`/`fill:'toself'` (só permite 1 cor de preenchimento por trace, incompatível com "cor por setor") para `barpolar` — cada setor é uma barra individual, com `marker.color` por setor calculado por `windSpeedColor()` (novo, em `dashboardChartConstants.ts`, mesmo gradiente azul→vermelhão Okabe-Ito já usado em `DirectionalHeatmap.tsx`) a partir de `wr[s]?.mean_ws`, normalizado por um máximo **compartilhado** entre os locais fixados (`windRoseMaxSpeed`, `useMemo`) — para as cores serem comparáveis entre locais, não escaladas individualmente. O contorno de cada barra (`marker.line.color`) mantém a cor do local (`COLORS[i]`), preservando a distinção visual entre locais fixados. Nova legenda `.windrose-legend` (gradiente CSS + rótulos `0 m/s`/`{max} m/s`) abaixo do gráfico. |
| **Novos basemaps: Terrain, Night, Topo** | `BasemapSwitcher.tsx` ganhou 3 novas opções (6 no total); `.basemap-switcher` ganhou `overflow-x: auto` (linha rolável em vez de crescer indefinidamente). Em `MapView.tsx`: `terrain` usa fonte `raster-dem` (AWS Open Data Terrain Tiles, encoding `terrarium`, sem chave de API) + camada `hillshade`; `night` usa o mosaico público NASA GIBS `VIIRS_CityLights_2012` (Black Marble, `maxzoom: 8`); `topo` usa OpenTopoMap (3 subdomínios `a/b/c`, CC-BY-SA). **Achado durante a implementação:** `BasemapSwitcher` já existia e já era importado em `MapView.tsx`, mas nunca era de fato renderizado no JSX (dead import) — `onBasemapChange` também nunca era consumido; o seletor de basemap simplesmente não existia na UI antes desta entrega, apesar dos 3 basemaps originais (Street/Satellite/Dark) já estarem funcionais no estilo do MapLibre. Corrigido junto com a expansão para 6 opções. |
| **Screenshot do mapa** | Novo botão "📷 Screenshot" (`.map-screenshot-btn`, canto superior direito, abaixo do `BasemapSwitcher`). Usa `map.getCanvas().toDataURL()` (conforme pedido no ticket) — exige `preserveDrawingBuffer: true` no construtor do `maplibregl.Map` (adicionado), sem o qual o canvas WebGL pode voltar vazio/preto fora do ciclo de render. A imagem é redesenhada em um `<canvas>` offscreen com uma marca de água (`"CNPq WebGIS — {modelo} {experimento} {variável} {altura}m"`, usando os labels legíveis de `cogCatalog.ts`) antes do download. Nome do arquivo: `webgis-map-{YYYY-MM-DD}.png`. Funciona 100% offline (nenhuma chamada de rede). |
| **Export de gráfico como PNG (Plotly toolbar)** | `PLOT_CONFIG` (`dashboardChartConstants.ts`) já tinha `displayModeBar: true` com o botão de download PNG nativo do Plotly — só precisava remover o excesso de botões de zoom/pan/hover-mode que os critérios de aceite chamam de "clutter". `modeBarButtonsToRemove` ampliado para `zoom2d`, `pan2d`, `zoomIn2d`, `zoomOut2d`, `autoScale2d`, `resetScale2d`, `hoverClosestCartesian`, `hoverCompareCartesian` (mantendo apenas o botão de download PNG). Nenhum botão customizado foi necessário — a opção "Alternativa" do ticket (`Plotly.downloadImage` customizado) não se aplicou. |

### Limitação conhecida — basemaps extras dependem de rede (fora do controle da app)

Diferente do export de mapa/gráfico (ambos 100% offline, conforme exigido), os 3 novos basemaps (Terrain/Night/Topo) buscam tiles de provedores públicos externos (AWS Open Data, NASA GIBS, OpenTopoMap) — mesma natureza dos 3 basemaps já existentes (OSM/Esri/CARTO). Validado visualmente com rede disponível (screenshot do hillshade do Terrain sobre a costa NE/SE renderizando relevo submarino real); sem rede, o comportamento é o mesmo já existente para Street/Satellite/Dark (tiles não carregam, sem erro de console).

### Testes novos — `tests/e2e/10-ui-enhancements.spec.ts` (T78–T85)

| Teste | O que valida |
|---|---|
| T78 | `BasemapSwitcher` exibe as 6 opções (incl. Terrain/Night/Topo); alternar entre elas não gera erro de console |
| T79 | Botão "Screenshot" do mapa dispara o download de um `.png` com nome datado |
| T80 | `.cog-loading` aparece durante o fetch do `.tif` (atraso determinístico via `page.route`) e some ao terminar |
| T81 | "Download CSV" fica desabilitado sem locais fixados e habilita após adicionar um |
| T82 | Clique em "Download CSV" gera um `.csv` com nome datado, cabeçalho e contagem de linhas esperados (50 linhas de dado para 1 local) |
| T83 | Toggle de tela cheia aplica/remove `chart-card--fullscreen`; `Escape` restaura o layout |
| T84 | Segundo clique no botão de tela cheia (sem `Escape`) também restaura o layout |
| T85 | Rosa dos Ventos usa `type: 'barpolar'` com mais de 1 cor de setor (`marker.color`) e exibe `.windrose-legend` |

**Validação manual (checklist do ticket):** dev server local — spinner aparece brevemente ao arrastar o mapa; CSV baixado abre com as colunas certas; tela cheia funciona nos 6 cards e o `<Plot>` interno redimensiona; Rosa dos Ventos mostra setores em tons diferentes (azul→laranja) com a legenda de velocidade; os 6 basemaps carregam sem erro de console (Terrain renderizando hillshade real sobre a costa); screenshot do mapa baixa um PNG com a marca de água legível.

### Arquivos modificados

`src/components/MapView.tsx`, `src/components/DashboardView.tsx`, `src/components/BasemapSwitcher.tsx`, `src/lib/pixelQuery.ts`, `src/lib/dashboardChartConstants.ts`, `src/App.css`, `tests/e2e/10-ui-enhancements.spec.ts` (novo)

---

## ✅ f04 — Performance (lazy-load do Plotly, cache IndexedDB com LRU, redraw do COG) — 2026-07-21

> **Status:** Implementado e validado (`pnpm test` — 94 passed, `pnpm test:types` — 0 erros). Escopo definido em `TODO.md` (raiz, removido após esta entrega — mesmo padrão já usado para `docs/TOFIX.md` na Fase 3.1).

### Itens concluídos

| Item | Resolução |
|---|---|
| Plotly (~1 MB) carregado mesmo em quem só usa o mapa | `DashboardView` agora é `React.lazy(() => import('./components/DashboardView'))` em `App.tsx`, com o painel do Dashboard só efetivamente montado (gate `dashboardVisited`) na primeira visita à aba — antes o componente ficava sempre montado atrás da aba Map (padrão `display:none` documentado desde a Fase 3.1/3.2). Dentro de `DashboardView.tsx`, `DashboardComparisonView.tsx` e `GeoParquetExplorer.tsx`, `Plot` também virou `lazy(() => import('react-plotly.js'))`, envolto em `<Suspense fallback={<DashboardSkeleton />}>` ao redor de cada `.dv-chart-grid` |
| Nenhum esqueleto de carregamento para o grid de gráficos | Novo `DashboardSkeleton.tsx`/`.css` — 4 retângulos cinza com shimmer, no mesmo layout de grid 2 colunas do `.dv-chart-grid`, usado como `fallback` dos 3 `Suspense` acima e do `Suspense` externo em `App.tsx` (enquanto o chunk do próprio `DashboardView` carrega) |
| Cache IndexedDB do parquet crescia sem limite e nunca purgava versões antigas | `pixelQuery.ts`: nova store `meta` (bump `DB_VERSION` 1→2) grava `{ size, lastAccessed }` por chave, ao lado da store `parquet` já existente (schema original preservado, só uma store nova). `cacheSet` estima o total somando os `size` da store `meta` e, acima de 50 MB (`MAX_CACHE_BYTES`), evict por LRU (`evictLru`, ordenado por `lastAccessed` ascendente) até voltar ao limite. `cacheGet` atualiza `lastAccessed` de forma fire-and-forget (não atrasa o cache hit) |
| Nenhuma invalidação real ao mudar `CACHE_VERSION` | `evictStaleVersionIfNeeded()` compara o `CACHE_VERSION` atual com o último salvo em `localStorage`; se mudou, `indexedDB.deleteDatabase()` inteiro antes de reabrir — reexecuta uma única vez por sessão (`versionCheckPromise`), antes de qualquer `openDB()` |
| Estatísticas de cache poluindo o console em produção | `console.debug` de tamanho total/evicções só roda atrás de `import.meta.env.DEV` |
| Alternar Map → Dashboard → Map disparava um redraw do COG idêntico ao anterior | `MapView.tsx`: novo `lastCogParamsRef` guarda uma fingerprint (`dataset\|variable\|height\|season\|model\|bounds\|zoom`) do último COG efetivamente renderizado; `drawCog` retorna cedo se a fingerprint não mudou. Causa raiz: `map.resize()` (disparado pelo `ResizeObserver` já existente, ao voltar de `display:none` para `flex`) emite `movestart`/`move`/`moveend` internamente no MapLibre mesmo sem pan/zoom real, o que reacionava o debounce de 300ms do `moveend` e re-buscava/redesenhava o mesmo tile. A fingerprint só é gravada após uma renderização bem-sucedida (não antes do fetch), para que uma falha de rede transiente continue reexecutável no próximo `moveend`/`idle` real |
| `onPixelClick` instável (item do escopo) | Já estava correto — `handlePixelClick` em `App.tsx` já era `useCallback` sem dependências desde antes desta fase; nenhuma mudança necessária |

### Bug pré-existente corrigido — Plotly (plotly.js completo) carregava mesmo na aba Map, nunca chegando perto do Dashboard

Investigando por que a aba Map continuava disparando uma requisição para `plotly__js_dist_plotly.js` mesmo com `DashboardView` e todo `<Plot>` lazy, um trace de rede (`Network.requestWillBeSent` via CDP, com `initiator`/`Referer`) mostrou a cadeia real: `App.tsx` → `PixelInfoPanel.tsx` (montado sempre na aba Map, para mostrar os dados do pixel clicado) → `DirectionalHeatmap.tsx` (import estático, usado também no popup do mapa) → `dashboardChartConstants.ts` — que carregava `import Plotly from 'plotly.js/dist/plotly'` no topo do arquivo só para o botão customizado "Resetar zoom" da rosa dos ventos (`WINDROSE_PLOT_CONFIG`/`Plotly.relayout`), mesmo `DirectionalHeatmap.tsx` usando só `SECTOR_LABELS` (um array de strings) desse módulo — nenhuma renderização Plotly de fato. Esse vazamento é anterior a esta fase (existia mesmo com `Plot` estático) e só ficou visível ao escrever o teste `T86` (interceptação de rede). **Correção:** `WINDROSE_PLOT_CONFIG` e o import de `Plotly` foram extraídos para um novo `src/lib/windroseConfig.ts`, consumido só por `DashboardView.tsx`/`DashboardComparisonView.tsx` (ambos já dentro da subárvore lazy do Dashboard); `dashboardChartConstants.ts` ficou livre de qualquer import de `plotly.js`, então `DirectionalHeatmap.tsx` (e por consequência `PixelInfoPanel.tsx`/aba Map) não puxa mais o pacote inteiro.

### O que não foi implementado nesta fase (limitações do ambiente, não de escopo)

1. **Análise de bundle de produção (`npx vite-bundle-visualizer`, redução de ~300 KB documentada) não foi executada.** `pnpm build` (`tsc -b && vite build`) falha neste ambiente por duas causas **pré-existentes, não relacionadas a esta fase**: (a) `vite build` tenta copiar `public/data/geoparquet/mpas` para `dist/` e o processo aborta com `ENOENT` — o caminho é montado via `DATA_ROOT = '/mnt/e/cnpq_webgis/data'` em `vite.config.ts` (ambiente original em WSL/Windows), inexistente neste ambiente macOS; (b) `tsc -b` (build real, com project references) acusa erros de tipo já presentes antes desta fase — `react-plotly.js`/`plotly.js` sem `@types` (`declare module` nunca foi criado) e um cast inválido em `pixelQuery.ts:161` (`ArrayBuffer.isView` → `ArrayLike<number>`), entre outros. **Achado colateral relevante:** `pnpm test:types` (`tsc --noEmit`) não detecta nenhum desses erros porque o `tsconfig.json` raiz é "solution-style" (`files: []`, só `references`) — `tsc --noEmit` nesse modo não segue as referências, então o comando roda "limpo" sem checar nada de fato. Os erros só aparecem via `tsc -b` (usado por `pnpm build`, nunca por `pnpm test`). Nenhuma mudança de código foi feita para corrigir isso — é pré-existente e fora do escopo desta fase — mas fica registrado aqui para não passar despercebido: o `pnpm test` "verde" do checklist de entrega não garante que `pnpm build` funcione.
2. **Validação de "memória estável em 5+ trocas de aba" foi via lógica (fingerprint do COG + `dashboardVisited`), não via profiling de heap real** (`performance.memory`/DevTools). O `lastCogParamsRef` elimina o redraw redundante que causaria o crescimento, mas nenhum teste automatizado mede footprint de heap em bytes (fora do escopo de E2E via Playwright puro, ver `CLAUDE.md` → "O que NÃO testar via E2E").

### Testes novos — `tests/e2e/11-performance.spec.ts`

| Teste | O que valida |
|---|---|
| T86 | A aba Map (sem nunca visitar o Dashboard) não dispara nenhuma requisição de rede cujo URL contenha "plotly" — regressão do vazamento `PixelInfoPanel → DirectionalHeatmap → dashboardChartConstants → plotly.js` corrigido nesta fase |
| T87 | Clicar em "Analytical Dashboard" dispara a requisição de rede do módulo Plotly sob demanda (prova de que o lazy-loading realmente adia o carregamento, em vez de só reorganizar imports sem efeito) |
| T88 | Alternar Dashboard → Map → Dashboard preserva a Altura selecionada na Visão Simples — regressão do novo gate `dashboardVisited` em `App.tsx` (antes `DashboardView` ficava sempre montado; agora o primeiro mount é condicional, então a preservação de estado local após esse ponto precisa continuar garantida) |

### Arquivos modificados

`src/App.tsx`, `src/components/DashboardView.tsx`, `src/components/DashboardComparisonView.tsx`, `src/components/GeoParquetExplorer.tsx`, `src/components/DashboardSkeleton.tsx` (novo), `src/components/DashboardSkeleton.css` (novo), `src/components/MapView.tsx`, `src/lib/pixelQuery.ts`, `src/lib/dashboardChartConstants.ts`, `src/lib/windroseConfig.ts` (novo), `tests/e2e/11-performance.spec.ts` (novo), `TODO.md` (raiz, removido após esta entrega)

---

## ✅ 1.D. Correções pré-merge (TOFIX.md) — 2026-06-22

> **Status:** Implementado e validado.

### Problemas críticos resolvidos

| Item | Resolução |
|---|---|
| Scroll bloqueado na landing page | `useEffect` em `App.tsx` adiciona/remove `landing-mode` em `document.documentElement`; `App.css` sobrescreve `overflow:hidden` via `html.landing-mode` |
| `overflow-y: auto` sem efeito no `.landing` | Removida dependência de scroll no componente; scroll agora ocorre no nível de documento |

### UX e navegação

| Item | Resolução |
|---|---|
| Ausência de menu de navegação entre seções | Adicionados links de âncora `.lp-nav-anchor` no navbar (Metodologia, Cenários, Interface, Equipe, Publicações) — ocultos em ≤ 900 px |
| Indicador de seção ativa | `useEffect` com `window.scroll` listener detecta posição atual e aplica classe `.active` no link correspondente |
| Botão "Voltar ao topo" ausente | Botão `.lp-back-to-top` fixo no canto inferior direito; aparece após 400 px de scroll; `window.scrollTo({ top: 0 })` |

### Design e tipografia

| Item | Resolução |
|---|---|
| Publicações difíceis de escanear | `<ol>` substituída por grid de cards `.lp-pub-card` com número circular, tipografia e hover |
| Sem diferenciação visual entre cenários históricos e futuros | Adicionados `lp-scenario-card--historical` (verde) e `lp-scenario-card--future` (vermelho) + legenda |
| Cards da galeria não pareciam clicáveis | Convertidos de `<div>` para `<button>`, com hover animado, descrição da visualização e `onClick` funcional |
| Equipe sem destaque para papéis principais | `.lp-team-card--coord` (borda escura) e `.lp-team-card--lead` (borda azul) |
| Espaçamento e line-height insuficientes | `line-height: 1.9` nos parágrafos; padding das seções aumentado para `72px`; `max-width: 56ch` nos parágrafos |

### Acessibilidade

| Item | Resolução |
|---|---|
| Ausência de `alt` em ícones/imagens | Todos os `<img>` têm `alt` descritivo; ícones decorativos têm `aria-hidden="true"` |
| `<th>` sem `scope` | `scope="col"` adicionado na tabela técnica |
| Foco de teclado | `:focus-visible` adicionado em todos os botões interativos |
| Roles ausentes | `aria-label` nos `<nav>`, botões de galeria e botão "Voltar ao topo" |

### Correção de configuração

| Item | Resolução |
|---|---|
| `playwright.config.ts` apontava para porta 5173; dev server roda na 3000 | `baseURL` e `webServer.url` atualizados para `http://localhost:3000` |

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | `useEffect` para toggling de `landing-mode` em `document.documentElement` |
| `src/App.css` | Regras `html.landing-mode` para desabilitar `overflow:hidden` global |
| `src/components/LandingPage.tsx` | In-page nav, back-to-top, gallery como buttons, pub cards, scenario differentiation, acessibilidade |
| `src/components/LandingPage.css` | Estilos para todos os novos elementos; typography improvements |
| `playwright.config.ts` | Porta corrigida: 5173 → 3000 |
| `CLAUDE.md` | Porta e contagem de testes atualizadas |

### Resultados da suite de testes — 2026-06-22 (atualizado)

**31/31 testes passando** em Chromium headless — tempo total: ~14 s.

| Arquivo | Testes | Status |
|---|---|---|
| `01-landing-page.spec.ts` | 12 | ✅ 12 passando |
| `02-navigation.spec.ts` | 9 | ✅ 9 passando |
| `03-responsiveness.spec.ts` | 4 | ✅ 4 passando |
| `04-scroll-and-inpage-nav.spec.ts` | 6 | ✅ 6 passando |

---

## ✅ 1.E. Novos testes para gallery cards e team toggle — 2026-06-22

> **Status:** Implementado e validado.

### Contexto

Após implementação das correções do TOFIX.md (seção 1.D), identificou-se que dois comportamentos novos não estavam cobertos por testes:

1. **Gallery cards como botões de navegação** — convertidos de `<div>` para `<button>` com `onClick` funcional; ausência de testes para esse novo ponto de entrada da navegação.
2. **Botão de colapso/expansão da equipe** — novo `<button class="lp-team-toggle">` com estado `aria-expanded`; comportamento toggle sem cobertura.

### Testes adicionados

| ID | Arquivo | O que valida |
|---|---|---|
| T12 | `02-navigation.spec.ts` | Gallery card "Abrir WebGIS Map" navega para o mapa |
| T13 | `02-navigation.spec.ts` | Gallery card "Dashboard" (primeiro) navega para o dashboard |
| T26 | `01-landing-page.spec.ts` | `.lp-team-toggle` visível, texto "Ver todos os 17 pesquisadores", `aria-expanded=false` no carregamento |
| T27 | `01-landing-page.spec.ts` | Clique no toggle define `aria-expanded=true` e exibe texto "Ver menos" |

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `tests/e2e/02-navigation.spec.ts` | T12 e T13 adicionados ao describe `'Navegação: Landing → Sistema'` |
| `tests/e2e/01-landing-page.spec.ts` | Novo describe `'TeamSection — colapso e expansão'` com T26 e T27 |
| `CLAUDE.md` | Estrutura de testes e contagem atualizadas para 31 |

---

## 🚀 1. Landing Page (Página Inicial)
> **Objetivo:** Criar uma porta de entrada institucional e moderna para o sistema, eliminando o carregamento direto do mapa pesado e contextualizando o fomento do CNPq.
> **Status:** ✅ Implementada e validada — 2026-06-21

- [x] **1.1. Layout & Estrutura Base:**
  - [x] Criar uma rota raiz (`/` ou `Home`) separada do ambiente de mapas.
  - [x] Adicionar seção de *Hero* com o título oficial do projeto: *"Cenário atual e futuro do recurso eólico offshore no Brasil"*.
  - [x] Inserir os dois botões principais de chamada para ação (CTA) com destaque visual:
    * `Abrir WebGIS Map` (Redireciona para o visualizador espacial).
    * `Abrir Analytical Dashboard` (Redireciona diretamente para a análise estatística).
- [x] **1.2. Seções de Conteúdo Técnico:**
  - [x] **Resumo Técnico:** Resumo do projeto detalhando o uso do modelo WRF, resoluções (~9 km), dados de contorno (ERA5, CMIP6 SSP2-4.5 e SSP5-8.5).
  - [x] **Galeria/Card de Imagens:** Seção criada com placeholders visuais (aguardando screenshots reais).
  - [x] **Créditos e Fomento:** Logomarcas CNPq/PEOB/SENAI CIMATEC, Chamada CNPq Nº 407949/2022-4, equipe completa (17 pesquisadores) e 9 publicações científicas.

---

### 1.A. O que está funcionando

| Item | Descrição |
|---|---|
| NavbarTop | Logo PEOB + CNPq, botão "Entrar no Sistema" (sticky, navega para `map`) |
| HeroSection | Título H1, subtítulo, parágrafo de contexto, CTAs primário e secundário |
| StatsStrip | 5 cards com indicadores-chave (WRF-ARW v4, 9 km, alturas, 4 experimentos, 17 estados) |
| TechSummarySection | 2 colunas: texto descritivo + tabela com 8 parâmetros técnicos |
| ScenariosSection | 4 cards (ERA5_atlas, HIST, SSP2-4.5, SSP5-8.5) com ícone, forçante, período e descrição |
| GallerySection | Grid 3 colunas com placeholders estilizados |
| TeamSection | Grid auto-fill com 17 pesquisadores; badges "Coordenador" e "Pesquisador Líder" |
| PublicationsSection | Lista ordenada com 9 publicações científicas |
| FooterSection | 3 logos, citação oficial, disclaimer de dados preliminares, copyright |
| Navegação `map` | CTA primário + navbar → `tab = 'map'`, TabBar aparece, landing desaparece |
| Navegação `dashboard` | CTA secundário → `tab = 'dashboard'`, dashboard carrega corretamente |
| Botão `← Home` no TabBar | Lado esquerdo do TabBar; volta para landing a qualquer momento sem recarregar a página |
| Preservação de estado | Filtros do mapa e dashboard não são resetados ao navegar pela landing |
| Responsividade | Layout adapta em ≤ 768 px (coluna única) e ≤ 480 px (CTAs empilhados) |
| Scroll próprio | Landing faz scroll interno (`.landing { overflow-y: auto }`) sem interferir no mapa |

---

### 1.B. O que não foi implementado nesta fase (e onde será desenvolvido)

| Item pendente | Motivo | Fase prevista |
|---|---|---|
| Screenshots reais na GallerySection | Imagens do sistema não disponíveis no momento da implementação | **Fase 2** — após estabilização da UI do mapa e dashboard |
| Links de repositório e DOI no FooterSection | DOI ainda não registrado no Zenodo | **Fase 5** (item 5.2) — Documentação Integrada |
| Logomarcas no painel `ProjectInfoPanel` | Fora do escopo da Fase 1 (painel interno do mapa) | **Fase 5** (item 5.2) — Incorporação de Logomarcas |
| Disclaimer de dados no `README.md` | Item de documentação, não de interface | **Fase 5** (item 5.2) — Disclaimer de Dados no README |
| Revisão cruzada FAQ × INFO_PROJECT.md | Discrepâncias de processo e grade documentadas | **Fase 5** (item 5.1) — Revisão Cruzada FAQ |
| SEO / meta tags / Open Graph | Não necessário para MVP interno | Não planejado — avaliar se necessário |

---

### 1.C. Especificações técnicas de desenvolvimento

#### Arquitetura de navegação

Optou-se por **não instalar `react-router-dom`**. A navegação entre landing e o sistema é gerenciada pelo `useState<TabId>` já existente em `App.tsx`, com o tipo `TabId` expandido de `'map' | 'dashboard'` para `'home' | 'map' | 'dashboard'`. O estado inicial foi alterado de `'map'` para `'home'`.

#### Arquivos criados

| Arquivo | Tamanho | Descrição |
|---|---|---|
| `src/components/LandingPage.tsx` | ~220 linhas | Componente principal com 9 sub-seções, dados estáticos embutidos (team, publications, scenarios, stats) |
| `src/components/LandingPage.css` | ~350 linhas | Estilos isolados da landing page; usa variáveis de cor do sistema; responsivo com 2 breakpoints |

#### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/components/TabBar.tsx` | Tipo `TabId` adicionado `'home'`; botão `← Home` adicionado à esquerda da barra com divisor visual |
| `src/App.tsx` | `useState<TabId>('map')` → `'home'`; import de `LandingPage`; renderização condicional `tab === 'home'` com `<LandingPage>`; classe dinâmica `app--landing` |
| `src/App.css` | Regra `.app--landing`; estilos `.tab-home-btn` e `.tab-bar-divider` |

#### Assets copiados

| Origem | Destino |
|---|---|
| `docs/logo-cnpq.png` | `public/images/logos/logo-cnpq.png` |
| `docs/logo-peob-cnpq.png` | `public/images/logos/logo-peob-cnpq.png` |
| `docs/logo-senai-cimatec.png` | `public/images/logos/logo-senai-cimatec.png` |

Referenciados em runtime via `import.meta.env.BASE_URL + 'images/logos/<arquivo>'`.

#### Pacotes instalados

Um pacote de desenvolvimento foi adicionado para a infraestrutura de testes de regressão:

| Pacote | Versão | Tipo | Motivo |
|---|---|---|---|
| `@playwright/test` | `^1.52.0` | `devDependency` | Framework de testes E2E com runner, assertions e relatórios integrados |

A implementação da landing page em si não requer nenhum pacote novo. Stack de produção permanece:

| Tecnologia | Versão (package.json) | Uso na Landing Page |
|---|---|---|
| React | 18.x | Componente funcional, `useState` implícito via App.tsx |
| TypeScript | 5.x | Tipagem de `TabId`, `Props` |
| Vite | 6.x | Serve assets estáticos de `public/`; resolve `import.meta.env.BASE_URL` |
| CSS3 nativo | — | Grid, Flexbox, `clamp()`, `position: sticky`, transições |

#### Infraestrutura de testes de regressão E2E

Os testes foram migrados de scripts ad-hoc para uma suite permanente com `@playwright/test`. Para executar:

```bash
pnpm test          # type check + todos os testes E2E
pnpm test:types    # apenas tsc --noEmit
pnpm test:e2e      # apenas Playwright (requer dev server rodando ou inicia automaticamente)
pnpm test:e2e:ui   # abre a UI interativa do Playwright
```

Arquivos da suite:

| Arquivo | Testes | Contexto |
|---|---|---|
| `tests/e2e/01-landing-page.spec.ts` | 9 testes | Conteúdo de cada seção, logos, carregamento inicial |
| `tests/e2e/02-navigation.spec.ts` | 7 testes | CTAs, navbar, botão `← Home`, persistência de aba ativa |
| `tests/e2e/03-responsiveness.spec.ts` | 4 testes | Scroll horizontal nos 3 breakpoints (1280 / 768 / 375 px) |
| `playwright.config.ts` | — | Base URL, webServer (auto-start com `reuseExistingServer`), relatório HTML |

Artefatos gerados em `tests/results/` (ignorados pelo git via `.gitignore`).

#### Resultados da suite de testes — 2026-06-21

**21/21 testes passando** em Chromium headless — tempo total: ~13 s.

| Arquivo | Testes | Status |
|---|---|---|
| `01-landing-page.spec.ts` | 9 | ✅ 9 passando |
| `02-navigation.spec.ts` | 8 | ✅ 8 passando |
| `03-responsiveness.spec.ts` | 4 | ✅ 4 passando |

Ferramenta: **Playwright 1.52.0** (`@playwright/test`) + Chromium 149 (playwright chromium-headless-shell v1228).

---

## 🎨 2. Front-End & UI/UX (Interface Geral)
> **Objetivo:** Implementar a navegação por abas superiores, resolver os travamentos e embutir os componentes gráficos do Plotly no padrão GWA.

- [ ] **2.1. Refatoração da Navegação Global (Abas Superiores):**
  - [ ] Criar uma barra de navegação superior fixa (*Navbar*) contendo as abas: `WebGIS Map` e `Analytical Dashboard`.
  - [ ] Garantir a persistência do estado global: alternar entre as abas **não deve** resetar os filtros selecionados (Experimento, Variável) nem limpar as coordenadas salvas pelo usuário.
- [ ] **2.2. Correção de Bugs Críticos (Garantia de Qualidade):**
  - [ ] **Bug do Mapa Cinza/Lado:** Corrigir o ciclo de vida do contêiner do mapa. Forçar o recálculo do tamanho do mapa (ex: `map.invalidateSize()` se Leaflet) utilizando um gatilho/efeito assim que a aba `WebGIS Map` for montada ou focada.
  - [ ] **Botão Fechar no Painel Direito:** Adicionar um botão de fechamento (`X`) explícito no topo do painel lateral direito para fechar os menus de FAQ e Informações do Projeto, devolvendo a área total da tela ao mapa.
- [ ] **2.3. Implementação dos Gráficos Avançados (Padrão Plotly/GWA):**
  - [ ] **Perfil Vertical do Vento (Aba WebGIS e Dashboard):** Plotar a velocidade do vento no eixo X e as alturas disponíveis ($10\text{ m}, 50\text{ m}, 100\text{ m}, 150\text{ m}, 200\text{ m}$) no eixo Y. O gráfico deve buscar todas as alturas via GeoParquet, independentemente da camada ativa no mapa.
  - [ ] **Rosa dos Ventos (Aba Dashboard):** Implementar o gráfico polar de barras (`type: 'barpolar'`) com a distribuição de frequência e direção do vento.
  - [ ] **Matriz de Calor / Heatmap (Aba Dashboard):** Criar o gráfico de cruzamento Hora (Y) vs. Mês (X) mostrando a variabilidade da velocidade do vento em uma escala de cores gradiente (azul/verde para fraco, amarelo/vermelho para forte).
  - [ ] **Gráfico de Radar (Aba Dashboard):** Plotar as 24 horas no círculo angular com 12 linhas sobrepostas (uma para cada mês do ano).
  - [ ] **Curva de Weibull Dinâmica:** Substituir os valores numéricos de $k$ e $c$ por um gráfico de linha contínua da PDF (Função de Densidade de Probabilidade).

---

## ⚙️ 3. Back-End, API & Engenharia de Dados
> **Objetivo:** Garantir a entrega performática dos dados do GeoParquet e implementar o motor de cálculo de energia.

- [ ] **3.1. Otimização de Consultas Espaciais no GeoParquet:**
  - [ ] Otimizar as rotas da API para aceitar arrays de coordenadas (até 3 pontos simultâneos) vindos do clique do mapa ou entrada de texto.
  - [ ] Retornar o pacote completo de variáveis de um pixel em uma única requisição (médias de vento em todas as alturas, parâmetros de Weibull locais, dados de direção para a Rosa dos Ventos).
- [ ] **3.2. Motor de Cálculo de Estimativa de Energia (AEP):**
  - [ ] Criar a lógica de retrodados para simular a Curva de Potência de uma turbina padrão (Ex: Genérica 4.5 MW - Classe IEC 2).
  - [ ] Desenvolver o algoritmo que realiza a convolução matemática entre a Distribuição de Weibull do pixel consultado e a Curva de Potência da turbina selecionada para estimar a Produção Anual de Energia (AEP - Annual Energy Production) considerando as perdas parametrizadas pelo usuário.

---

## 📊 4. Componente Dashboard Global (Multi-Localidades)
> **Objetivo:** Permitir a análise comparativa avançada sem loops ou fechamentos inesperados de tela.

- [ ] **4.1. Controle de Estado Multi-Pixel:**
  - [ ] Permitir que o usuário adicione até 3 localidades simultaneamente na lista de comparação.
  - [ ] Associar uma cor de identificação estrita para cada ponto (ex: Ponto 1 = Azul, Ponto 2 = Vermelho, Ponto 3 = Verde).
- [ ] **4.2. Sobreposição de Dados (Traces Overlapping):**
  - [ ] Configurar os gráficos do Plotly no Dashboard (Série Temporal, Perfil Vertical e Weibull) para renderizar até 3 linhas/séries na mesma tela quando houver múltiplos pontos selecionados.
- [ ] **4.3. Entrada Manual de Coordenadas:**
  - [ ] Desenvolver o formulário de validação numérica no topo do Dashboard para inserção direta de valores de Latitude e Longitude via teclado, disparando a busca no GeoParquet da mesma forma que o clique no mapa.
- [ ] **4.4. Melhorias pós-merge do Dashboard (TOFIX.md, categoria C):**
  - [x] **C2** — Auto-load do parquet ao entrar no Dashboard *(feito na Fase 3.3)*
  - [x] **C5** — Boxplot de Batimetria ordenado por profundidade (`0_20`, `20_50`, `50_100`) *(feito na Fase 3.3)*
  - [ ] **C1** — Botão "Recarregar Dashboard" (alternativa manual à re-consulta automática dos pinned locations)
  - [ ] **C3** — Minitabela de coordenadas abaixo do minimapa ("Local | Lat | Lon" + botão de remoção por linha)
  - [ ] **C4** — Remover o perfil vertical de WPD do Dashboard ou substituir por placeholder "sem dados" (coluna `wpd_profile_means` não existe no pipeline — ver categoria B)
  - [ ] **C6** — Adicionar curva Weibull ao GeoParquet Explorer (ao lado do histograma)
  - [ ] **C7** — Scatter de distância com agregação por steps discretos (0, 20, 50, 100, 200 nm) — depende de `distance_nm` existir no pipeline *(filtro/scatter desabilitados com aviso explícito na Fase 3.5, enquanto o dado não existe)*
  - [ ] **C8** — Publicar dados COG e GeoParquet do MPAS em `public/data/cogs/mpas/` e `public/data/geoparquet/mpas/`
  - [ ] **C9** — `SSP2-4.5_presente`/`SSP2-4.5_futuro` (e o par `SSP5-8.5`) colapsam para a mesma pasta em disco (mesmo bug estrutural do ERA5 corrigido na Fase 3.5, mas aqui a duplicidade é indevida — presente/futuro de um cenário climático deveriam ter dado real distinto). Depende do pipeline publicar dois períodos reais por cenário; decisão de priorização pendente.

---

## 📚 5. Documentação Integrada & Metadados
> **Objetivo:** Fornecer autonomia de informação ao usuário final diretamente pelos painéis inferiores da barra esquerda.

- [ ] **5.1. FAQ Estruturado (20 Perguntas e Respostas):**
  - [ ] Criar o componente de Accordion (Retrátil) no painel esquerdo para abrigar as 20 principais dúvidas do projeto.
  - [ ] *Lista de Tópicos Obrigatórios a redigir:* Fontes dos dados (WRF e ERA5), resolução espacial de $5\text{ km}$, metodologia das faixas de batimetria (0 a -100m), origem dos shapefiles regulatórios, significado de variáveis como Densidade de Potência, volume total de dados ($1.7\text{ TB}$ em Zarr), horizontes temporais avaliados (século XXI) e formato correto de citação científica do projeto.
  - [ ] **Revisão Cruzada FAQ:** Verificar e corrigir as 20 respostas em `src/lib/metadata.ts` contra os valores definitivos em `docs/INFO_PROJECT.md`. Discrepâncias conhecidas: número do processo (FAQ diz "Chamada CNPq Nº 45/2024", DOCX diz "Projeto 407949/2022-4"), dimensões da grade (FAQ diz "534×263", DOCX aponta D02 como "388×553").
- [ ] **5.2. Metadados Internos:**
  - [ ] Mapear e descrever em tabela legível todas as variáveis disponíveis para download ou visualização no sistema, indicando as unidades de medida oficiais de acordo com o padrão do CNPq.
  - [ ] **Incorporação de Logomarcas:** Adicionar os arquivos `docs/logo-cnpq.png`, `docs/logo-peob-cnpq.png` e `docs/logo-senai-cimatec.png` no footer da Landing Page e no painel de Informações do Projeto.
  - [ ] **Disclaimer de Dados no README:** Adicionar aviso no `README.md` do projeto informando que os dados disponíveis neste repositório são **preliminares, para fins de desenvolvimento**. Os dados finais (otimizados em formato e performance) serão atualizados posteriormente.

---

## ⚡ 6. Otimização de Performance & Engenharia de Dados do Dashboard
> **Objetivo:** Garantir respostas sub-segundo nas consultas do dashboard multi-localidade (3 pontos simultâneos) e assegurar renderização fluida a 60 FPS.

### 6.1. Data Engineering & Server-Side (GeoParquet / Backend)
> **Contexto:** Atualmente o frontend carrega o GeoParquet inteiro via WebAssembly (~17-19 MB por experimento) e realiza busca euclidiana em ~140k registros. Para escalar com múltiplos pontos simultâneos e preparar para datasets maiores, é necessário um backend leve.

- [ ] **6.1.1. Indexação Espacial & Particionamento:** Definir estratégia de particionamento dos GeoParquet. Padronizar por `Experiment` e `Height`, ou aplicar indexação espacial via H3 Hexágonos / S2 Geometry para acelerar consultas ponto-em-polígono e coordenadas pontuais.
- [ ] **6.1.2. Otimização de Compressão:** Avaliar e implementar o codec de compressão ideal (Snappy vs. ZSTD) no pipeline Python/Conda de geração dos GeoParquet para minimizar I/O durante requisições do frontend.
- [ ] **6.1.3. Camada de Agregação de Consultas:** Configurar motor analítico leve (ex.: DuckDB ou Fastparquet via FastAPI) como ponte entre o frontend e os arquivos GeoParquet. A API deve processar requisições de até 3 coordenadas simultâneas, realizando fatias colunares rápidas nos arquivos Parquet em vez de escanear o dataset inteiro.
- [ ] **6.1.4. Estratégia de Cache Server-Side:** Implementar cache (ex.: Redis ou memory-cache) para coordenadas de pixel frequentemente acessadas — como clusters eólicos offshore (ex.: Bacia de Campos, litoral do RN/CE) e capitais estaduais costeiras — para eliminar leituras redundantes de disco.

### 6.2. Frontend Performance & Stress Testing (Dashboard)
> **Contexto:** Os gráficos atuais usam Chart.js sem aceleração WebGL. Com 3 pontos simultâneos e séries temporais longas, a renderização pode cair abaixo de 30 FPS.

- [ ] **6.2.1. Fetch Assíncrono Paralelo:** Configurar o state manager do frontend para disparar requisições assíncronas paralelas (`Promise.all` ou `Promise.allSettled`) na recuperação de séries temporais para os 3 pontos comparativos, evitando bloqueio da UI.
- [ ] **6.2.2. Aceleração WebGL no Plotly:** Para gráficos de alta densidade (séries temporais horárias multi-ano, heatmaps multi-traço), migrar de Chart.js para Plotly com tipos acelerados por WebGL (`scattergl` em vez de `scatter`, `heatmapgl` etc.) para manter 60 FPS suaves em scroll e hover.
- [ ] **6.2.3. Script de Teste de Estresse End-to-End:** Criar rotina de teste automatizada (ou sequência de validação manual documentada) no dashboard onde 3 pins offshore arbitrários são selecionados simultaneamente para verificar:
  - *Footprint* de memória do navegador (alvo: < 200 MB adicionais)
  - Latência de renderização dos gráficos (alvo: < 500 ms para exibir todos os traces)
  - Consumo de CPU durante animações/hover

### 6.3. Benchmarks & Documentação de Performance
- [ ] **6.3.1. Definição de SLAs:** Estabelecer métricas-objetivo documentadas:
  - Consulta de pixel único via API: < 100 ms
  - Carregamento do dashboard com 3 pontos: < 500 ms
  - Uso de memória adicional no frontend: < 50 MB
  - Renderização de gráfico individual: < 200 ms
- [ ] **6.3.2. Script de Benchmark Automatizado:** Criar script Node.js ou Python para medir tempos de resposta da camada de consulta GeoParquet e registrar resultados em `docs/BENCHMARKS.md`.
- [ ] **6.3.3. Data Pipeline Profiling:** Instrumentar o pipeline de geração de dados (NetCDF → COG + GeoParquet) para registrar tempos de processamento por etapa, compressão alcançada e taxa de acerto do cache, visando identificar gargalos para a versão final dos dados.

---

> **Nota:** As tarefas desta seção pressupõem a introdução de um backend leve (FastAPI + DuckDB) e a migração gradual de Chart.js para Plotly nos gráficos de alta densidade. Consulte `docs/INFO_PROJECT.md` para a especificação completa dos datasets e `src/lib/pixelQuery.ts` para a arquitetura atual de consultas.