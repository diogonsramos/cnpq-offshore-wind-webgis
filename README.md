# CNPq WebGIS — Recurso Eólico Offshore

> **Cenário atual e futuro do recurso eólico offshore no Brasil: ferramentas e aplicações**
> Projeto CNPq 407949/2022-4 · CS2I — SENAI CIMATEC · 2024–2026

Visualizador geográfico interativo para dados de vento e densidade de potência eólica offshore, baseado em simulações climáticas regionais WRF-ARW v4 com downscaling para ~9 km de resolução (~0,07° de grade) e projeções CMIP6 (SSP2-4.5 e SSP5-8.5).

> **⚠️ Dados preliminares:** Os arquivos em `public/data/` (COGs e GeoParquet) são destinados exclusivamente ao desenvolvimento e validação do frontend. Os datasets finais, otimizados para produção, serão publicados em versão futura.

---

## Funcionalidades

### Landing Page institucional

- **NavbarTop** — logo PEOB/CNPq, links de âncora para seções (Metodologia, Cenários, Interface, Equipe, Publicações, FAQ) e botão "Entrar no Sistema"
- **HeroSection** — título oficial, CTAs primário (WebGIS Map) e secundário (Analytical Dashboard)
- **StatsStrip** — 5 indicadores técnicos em destaque
- **Resumo Técnico** — texto descritivo + tabela de parâmetros do modelo
- **Cenários Simulados** — 4 cards com diferenciação visual entre cenários históricos (verde) e futuros (vermelho)
- **Visualizações** — galeria de cards clicáveis com descrição de cada ferramenta
- **Equipe** — 17 pesquisadores com avatar circular, link para currículo Lattes e destaque visual para coordenador e líderes
- **Publicações** — 9 publicações científicas em cards escaneáveis
- **FAQ** — accordion com 20 perguntas frequentes (mesmo conteúdo do WebGIS), com link de entrada para o sistema
- **Footer** — logos institucionais, citação oficial e disclaimer de dados

### Sistema de análise

- **Mapa Interativo (WebGIS)** — COGs de velocidade do vento e densidade de potência sobre **6 basemaps** (Street, Satellite, Dark, Terrain, Night, Topo — seletor em linha rolável), com opacidade ajustável e overlays de batimetria/ZEE
- **Indicador de carregamento do COG** — spinner sutil (`.cog-loading`, não bloqueia pan/zoom) durante o fetch/render de cada tile
- **Screenshot do mapa** — captura o canvas com marca de água (modelo/experimento/variável/altura) e baixa um PNG, 100% offline
- **Filtros** — Modelo (WRF/MPAS) × Experimento × Variável × Altura × Estação × Estado × Faixa batimétrica
- **Perfil Vertical** — velocidade do vento e densidade de potência (WPD) em 10, 50, 100, 150 e 200 m para um ponto clicado
- **Distribuição de Weibull** — curva PDF com parâmetros k (forma) e c (escala)
- **Distribuição Direcional** — heatmap setor × faixa de velocidade/potência
- **Painel Analítico (Dashboard)** — 4 abas internas:
  - **Visão Simples** — até 3 localizações comparadas em 6 gráficos Plotly (média sazonal, Weibull, rosa dos ventos, perfil vertical WS/WPD, heatmap direcional), cada um com toggle de tela cheia
  - **Comparar Experimentos** / **Comparar Modelos** — até 3 pares modelo+experimento sobrepostos nos mesmos tipos de gráfico
  - **Explorador GeoParquet** — filtros por estado/batimetria/distância da costa, com histograma, boxplot, scatter e perfil agregado sobre ~140 mil pixels
- **Rosa dos Ventos colorida** — setores em `barpolar` coloridos pela velocidade média do vento (gradiente azul→vermelho), com legenda de escala
- **Exportação CSV** — baixa todas as localizações/sazonalidades/variáveis/alturas fixadas em um único arquivo (`Blob` + `URL.createObjectURL`, sem dependência nova)
- **Exportação de gráficos** — botão nativo do Plotly (toolbar reduzida, mantendo só o download PNG)
- **Marcadores de Pin** — até 3 pontos fixados; persistem entre abas e são re-consultados automaticamente ao trocar modelo/experimento
- **Navegação sem react-router** — estado gerenciado por `useState<TabId>` em `App.tsx`; botão `← Home` no TabBar retorna à landing sem recarregar

---

## Início rápido

### Pré-requisitos

- [Node.js](https://nodejs.org/) ≥ 18
- [pnpm](https://pnpm.io/) ≥ 8

### Instalação

```bash
pnpm install
```

### Execução

```bash
pnpm dev
# Abre em http://localhost:3000
```

### Scripts

| Comando | Descrição |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento (porta 3000) |
| `pnpm build` | Build de produção |
| `pnpm preview` | Serve o build localmente |
| `pnpm test` | Type check TypeScript + suite completa E2E |
| `pnpm test:types` | Apenas `tsc --noEmit` |
| `pnpm test:e2e` | Apenas Playwright (inicia dev server automaticamente) |
| `pnpm test:e2e:ui` | Interface visual do Playwright |

---

## Testes de Regressão E2E

O projeto usa **Playwright** para testes end-to-end que verificam que as funcionalidades existentes continuam funcionando após cada mudança.

### Pré-requisito (primeira vez)

```bash
pnpm exec playwright install chromium
```

### Executar

```bash
pnpm test          # recomendado antes de qualquer commit
pnpm test:e2e      # apenas os testes
pnpm test:e2e:ui   # modo visual para depuração
```

### Saída esperada

```
91 passed (~1.2 min)
```

### Cobertura de testes

| Arquivo | Testes | Contexto |
|---|---|---|
| `01-landing-page.spec.ts` | 12 | Seções, contagens de elementos, logos |
| `02-navigation.spec.ts` | 9 | CTAs, navbar, botão `← Home`, persistência de aba |
| `03-responsiveness.spec.ts` | 8 | Scroll horizontal nos 3 breakpoints (1280/768/375 px), landing + Dashboard |
| `04-scroll-and-inpage-nav.spec.ts` | 6 | Scroll vertical, âncoras, botão "Voltar ao topo" |
| `05-team-and-faq.spec.ts` | 10 | Avatares, links Lattes, FAQ accordion |
| `06-dashboard-controls.spec.ts` | 17 | Seletores Modelo/Experimento, opacidade do COG, camadas de batimetria, conteúdo real de Weibull/Rosa dos Ventos |
| `07-dashboard-comparison.spec.ts` | 6 | Abas "Comparar Experimentos"/"Comparar Modelos", limite de 3 pares, persistência de seleção |
| `08-geoparquet-explorer.spec.ts` | 10 | Filtros, "Aplicar Filtros", boxplots por Estado/Batimetria, modebar do Plotly, scatter de distância |
| `09-dashboard-charts.spec.ts` | 5 | Perfil WPD, heatmap direcional, ranges fixos de eixo |
| `10-ui-enhancements.spec.ts` | 8 | Spinner do COG, export CSV, tela cheia dos gráficos, rosa dos ventos colorida, basemaps extras, screenshot do mapa |

> Os arquivos `06`–`10` cobrem o sistema (mapa + dashboard) e evoluíram ao longo de várias fases (`f01`–`f03`); o detalhamento teste-a-teste de cada fase (IDs `T38`–`T85`) fica em [`docs/TODO.md`](docs/TODO.md), que é a fonte de verdade para o histórico de entregas. As tabelas abaixo mantêm o detalhamento por teste apenas para os 5 arquivos originais da landing page.

#### Detalhamento por arquivo

**`01-landing-page.spec.ts`**

| Teste | O que valida |
|---|---|
| T02 | Landing page abre por padrão (`.tab-bar` ausente) |
| T03 | H1 contém o título oficial do projeto |
| NavbarTop | `.lp-navbar` e botão "Entrar no Sistema" visíveis |
| HeroSection | Dois CTAs com textos corretos |
| StatsStrip | Exatamente 5 `.lp-stat-card` |
| ScenariosSection | 4 `.lp-scenario-card` com nomes corretos |
| TeamSection | Exatamente 17 `.lp-team-card` |
| PublicationsSection | Exatamente 9 `.lp-pub-card` |
| FooterSection | `.lp-footer-disclaimer` contém "preliminares" |
| T09 | 3 logos carregam com status HTTP < 400 |
| T26 | Botão de toggle da equipe visível e colapsado por padrão |
| T27 | Clique no toggle expande todos os membros da equipe |

**`02-navigation.spec.ts`**

| Teste | O que valida |
|---|---|
| T04 | CTA primário abre o mapa |
| T05 | CTA secundário abre o dashboard |
| T06 | "Entrar no Sistema" abre o mapa |
| T12 | Gallery card "WebGIS Map" abre o mapa |
| T13 | Gallery card "Dashboard" abre o dashboard |
| T10 | Botão `← Home` visível no TabBar |
| T11 | `← Home` retorna à landing |
| T11b | `← Home` funciona vindo do dashboard |
| T07 | Aba ativa persiste ao alternar mapa/dashboard |

**`03-responsiveness.spec.ts`**

| Teste | O que valida |
|---|---|
| T08 desktop (1280 px) | `scrollWidth` ≤ `clientWidth` (landing page) |
| T08 tablet (768 px) | `scrollWidth` ≤ `clientWidth` (landing page) |
| T08 mobile (375 px) | `scrollWidth` ≤ `clientWidth` (landing page) |
| T08b | CTAs empilhados verticalmente em mobile |
| T60 (× 3 breakpoints) | Dashboard sem scroll horizontal nas 4 abas internas, em 1280/768/375 px |
| T61 | Visão Simples: filtros e "+ Add Location" não ficam espremidos em mobile/tablet |

**`04-scroll-and-inpage-nav.spec.ts`**

| Teste | O que valida |
|---|---|
| T20 | `window.scrollY` aumenta após `scrollBy` |
| T21 | `scrollHeight` > `clientHeight` |
| T22 | Navbar contém 6 links `.lp-nav-anchor` |
| T23 | Seções têm IDs `metodologia`, `cenarios`, `interface`, `equipe`, `publicacoes`, `faq` |
| T24 | Botão `.lp-back-to-top` oculto no carregamento |
| T25 | Botão `.lp-back-to-top` visível após scroll |

**`05-team-and-faq.spec.ts`**

| Teste | O que valida |
|---|---|
| T28 | Exatamente 17 `.lp-team-avatar` visíveis |
| T29 | Todos os cards têm `href` com `lattes.cnpq.br` |
| T30 | `.lp-team-card--coord` com exatamente 1 card (Davidson) |
| T31 | `.lp-team-card--lead` com exatamente 2 cards |
| T32 | Seção `#faq` e `.lp-faq-list` presentes |
| T33 | Exatamente 20 `.lp-faq-item` |
| T34 | Todas as perguntas fechadas por padrão (`aria-expanded=false`) |
| T35 | Clique em pergunta abre a resposta |
| T36 | Clique em pergunta aberta a fecha |
| T37 | Abrir nova pergunta fecha a anterior |

---

## Estrutura do Projeto

```
cnpq-offshore-wind-webgis/
├── public/
│   ├── data/
│   │   ├── bathymetry/           # Shapefiles de batimetria (GeoJSON) — camadas de ZEE (`/data/shp/*`) ainda não publicadas
│   │   ├── cogs/                 # Cloud Optimized GeoTIFFs (~42 MB)
│   │   │   ├── wrf/{ERA5_atlas,HIST,SSP2-4.5,SSP5-8.5}/
│   │   │   └── mpas/              # ainda sem dado publicado
│   │   └── geoparquet/            # GeoParquet de consultas analíticas (~227 MB)
│   │       ├── wrf/{era5_atlas,hist,ssp2-4.5,ssp5-8.5}/season={annual,djf,mam,jja,son}/data.parquet
│   │       └── mpas/               # ainda sem dado publicado
│   ├── images/logos/             # Logomarcas (CNPq, PEOB, SENAI CIMATEC)
│   └── images/team/              # Fotos dos pesquisadores (avatares)
│   └── parquet_wasm_bg.wasm      # Runtime WebAssembly para leitura de Parquet
├── src/
│   ├── components/
│   │   ├── LandingPage.tsx       # Página inicial institucional
│   │   ├── LandingPage.css       # Estilos isolados da landing page
│   │   ├── MapView.tsx           # Mapa principal (MapLibre GL + COG + pins + basemaps + screenshot)
│   │   ├── DashboardView.tsx     # Painel analítico — aba "Visão Simples" + export CSV + fullscreen
│   │   ├── DashboardComparisonView.tsx  # Abas "Comparar Experimentos"/"Comparar Modelos"
│   │   ├── GeoParquetExplorer.tsx # 4ª aba do Dashboard — filtros + histograma/boxplot/scatter
│   │   ├── DirectionalHeatmap.tsx # Heatmap direcional (setor × faixa de velocidade/potência)
│   │   ├── SidePanel.tsx         # Filtros laterais do mapa
│   │   ├── TabBar.tsx            # Barra de abas + botão ← Home
│   │   ├── PixelInfoPanel.tsx    # Painel de informações do pixel
│   │   ├── ProfileChart.tsx      # Perfil vertical WS/WPD (Chart.js)
│   │   ├── WeibullChart.tsx      # Distribuição de Weibull (Chart.js)
│   │   ├── MiniMap.tsx           # Mini-mapa no dashboard
│   │   ├── BasemapSwitcher.tsx   # Seletor de mapa base (6 opções)
│   │   ├── FAQPanel.tsx          # Painel FAQ (accordion)
│   │   ├── ProjectInfoPanel.tsx  # Painel de informações do projeto
│   │   └── ErrorBoundary.tsx     # Captura de erros React
│   ├── lib/
│   │   ├── cogCatalog.ts             # Catálogo de experimentos, variáveis, alturas, caminhos de COG
│   │   ├── cogTileRenderer.ts        # Renderizador de tiles COG (GeoTIFF.js)
│   │   ├── pixelQuery.ts             # Engine de consulta GeoParquet via WebAssembly
│   │   ├── dashboardChartConstants.ts # Paleta Okabe-Ito, config do Plotly, gradiente da rosa dos ventos
│   │   └── metadata.ts               # Conteúdo do FAQ e Project Info
│   ├── i18n/
│   │   ├── t.ts                  # Stub de tradução (lê de um único dicionário)
│   │   └── pt-BR.ts               # Dicionário pt-BR (único idioma ativo hoje)
│   ├── App.tsx                   # Componente raiz com estado global
│   ├── App.css                   # Estilos do sistema (mapa, dashboard, drawers)
│   └── main.tsx                  # Ponto de entrada React
├── tests/e2e/                     # 91 testes — ver "Testes de Regressão E2E"
│   ├── 01-landing-page.spec.ts
│   ├── 02-navigation.spec.ts
│   ├── 03-responsiveness.spec.ts
│   ├── 04-scroll-and-inpage-nav.spec.ts
│   ├── 05-team-and-faq.spec.ts
│   ├── 06-dashboard-controls.spec.ts
│   ├── 07-dashboard-comparison.spec.ts
│   ├── 08-geoparquet-explorer.spec.ts
│   ├── 09-dashboard-charts.spec.ts
│   └── 10-ui-enhancements.spec.ts
├── docs/
│   ├── INFO_PROJECT.md           # Fonte oficial de metadados (equipe, parâmetros, citação)
│   ├── TODO.md                   # Roadmap por fases — histórico detalhado de cada entrega
│   └── TOFIX.md                  # Pontos de melhoria identificados na revisão
├── CLAUDE.md                     # Instruções de desenvolvimento para IA e humanos
├── playwright.config.ts          # Configuração E2E (base URL: localhost:3000)
├── vite.config.ts                # Dev server na porta 3000
└── package.json
```

---

## Datasets

| Experimento | Descrição | Período | Cenário |
|---|---|---|---|
| **ERA5_atlas** | Downscaling WRF forçado por ERA5 | 2004–2024 | Histórico observacional (referência) |
| **HIST** | WRF Histórico (treinamento para bias correction) | 2004–2014 | Histórico simulado |
| **SSP2-4.5** | Projeção CMIP6 (18 modelos) — mitigação moderada | 2015–2023 + 2030–2050 | ~4,5 W/m² |
| **SSP5-8.5** | Projeção CMIP6 (18 modelos) — emissões elevadas | 2015–2023 + 2030–2050 | ~8,5 W/m² |

> **Modelo MPAS:** já selecionável na UI (Modelo × Experimento), mas `public/data/cogs/mpas/` e `public/data/geoparquet/mpas/` ainda não têm nenhum arquivo publicado — a seleção mostra "sem dados disponíveis" sem erro de console. Ver `docs/TODO.md` para o roadmap de publicação.

### Variáveis disponíveis no frontend

| Sigla | Descrição | Unidade |
|---|---|---|
| `ws` | Velocidade do vento | m/s |
| `wpd` | Densidade de potência eólica | W/m² |

### Alturas do perfil vertical

10 m · 50 m · 100 m · 150 m · 200 m

### Estações sazonais

`ANNUAL` · `DJF` (verão) · `MAM` (outono) · `JJA` (inverno) · `SON` (primavera)

### Resolução espacial

Grade regular de 534 × 263 pontos (~140 mil células), originada do domínio D02 do WRF (388 × 553, ~9 km), regridada para ~0,07° lat/lon. Projeção EPSG:4326 (WGS84).

---

## Tecnologias

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18.x | Framework frontend |
| TypeScript | 5.x | Tipagem estática (sem `any`) |
| Vite | 6.x | Bundler e dev server (porta 3000) |
| MapLibre GL JS | ^4.7.1 | Renderização do mapa (WebGL), incl. hillshade do basemap Terrain |
| Plotly.js + react-plotly.js | ^3.7.0 / ^2.6.0 | Gráficos do Dashboard (sazonal, Weibull, rosa dos ventos, perfis, GeoParquet Explorer) |
| Chart.js + react-chartjs-2 | ^4.5.1 | Gráficos do Pixel Info Panel (perfil vertical, Weibull) |
| parquet-wasm + Apache Arrow | — | Leitura de GeoParquet via WebAssembly |
| GeoTIFF.js | — | Decodificação de COGs client-side |
| Playwright | ^1.61.0 | Testes de regressão E2E |

---

## Arquitetura

### Fluxo de renderização COG

```
buildCogUrl() → fetch(tile) → GeoTIFF.parse() → canvas drawImage
              → addSource('image') → addLayer('raster')
```

### Fluxo de consulta pixel

```
click no mapa → queryNearest(lat, lon) → busca euclidiana ~140k pixels
             → retorna PixelDataSummary → ProfileChart + WeibullChart
```

### Fluxo de dashboard

```
queryDashboardLocation(lat, lon, model, experiment) → agrega por estação via allSeasonMap
                                                     → pinnedLocations[] → gráficos Plotly reativos
```

O Dashboard tem 4 abas internas montadas simultaneamente (alternância via CSS `display`, preservando estado/seleção ao trocar): **Visão Simples**, **Comparar Experimentos**, **Comparar Modelos** e **Explorador GeoParquet**. Trocar Modelo/Experimento global re-consulta automaticamente cada localização fixada (`useEffect([model, dataset])` em `App.tsx`), sem perder os pinos já colocados.

### Export CSV e screenshot (sem dependência nova)

```
Dashboard "Download CSV"  → Blob(csv) → URL.createObjectURL → <a download> oculto → clique programático
MapView "📷 Screenshot"   → map.getCanvas().toDataURL() → <canvas> offscreen + marca de água → download PNG
```

Ambos os exports funcionam 100% offline. O screenshot do mapa exige `preserveDrawingBuffer: true` no `maplibregl.Map` para que o canvas WebGL não volte vazio fora do ciclo de render.

### Navegação (sem react-router)

```
useState<TabId>('home')  →  'home': LandingPage
                         →  'map':  TabBar + SidePanel + MapView
                         →  'dashboard': TabBar + DashboardView
```

---

## Guia de contribuição

### Adicionar um novo experimento

1. Edite `src/lib/cogCatalog.ts` — tipo `Dataset`, array `DATASETS`, labels
2. Adicione dados em `public/data/cogs/wrf/{experimento}/` e `public/data/geoparquet/wrf/{experimento}/`
3. Adicione o card correspondente em `SCENARIOS` no `LandingPage.tsx`

### Editar textos do FAQ ou Project Info

Edite `src/lib/metadata.ts`. Use `docs/INFO_PROJECT.md` como fonte de verdade para valores técnicos.

### Arquivos de referência

| Arquivo | Contém |
|---|---|
| `docs/INFO_PROJECT.md` | Metadados oficiais: equipe, parâmetros, experimentos, citação |
| `docs/TODO.md` | Roadmap por fases — itens feitos e pendentes |
| `src/lib/cogCatalog.ts` | Catálogo de experimentos, variáveis, alturas, caminhos de COG |
| `src/lib/metadata.ts` | Textos do FAQ e painel de Informações do Projeto |

---

## Citação

```
Cenário atual e futuro do recurso eólico offshore no Brasil: ferramentas e aplicações.
Projeto 407949/2022-4. Coordenação: Davidson Martins Moreira.
CS2I — SENAI CIMATEC, Salvador, BA, Brasil.
DOI: [a registrar no Zenodo]
```

---

## Licença

Dados: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)
Código: [MIT](LICENSE)
