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
2. **A coluna `distance_nm` não existe nos arquivos GeoParquet reais** — `pixelQuery.ts` já tratava sua ausência com fallback `?? 0` (implementado na Fase 1), então todo pixel real tem `distance_nm = 0`. Isso torna o filtro de "Distância da Costa" e o gráfico de dispersão funcionalmente inertes hoje (todos os pontos caem em x=0; a reta de regressão degenera e não é desenhada, `den === 0`) — não é um bug desta fase, é uma limitação do dado publicado. **O que falta:** a pipeline de geração do GeoParquet precisa calcular e escrever `distance_nm` por pixel (distância até a linha de costa mais próxima); nenhuma mudança é necessária no código do Explorer, que já consome a coluna corretamente quando ela existir.
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