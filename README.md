# CNPq WebGIS Viewer

Visualizador geográfico interativo para dados de recurso eólico offshore brasileiro, baseado em simulações climáticas regionais WRF com downscaling para ~9 km de resolução (~0,07° de grade).

---

## Funcionalidades

- **Mapa Interativo (WebGIS)**: Visualização de COGs (Cloud Optimized GeoTIFFs) de velocidade do vento e densidade de potência eólica sobre mapa base (Street, Satellite, Dark)
- **Perfil Vertical**: Gráfico de barras horizontal mostrando a velocidade do vento em múltiplas altitudes (10 m, 50 m, 100 m, 150 m, 200 m) para um ponto clicado
- **Distribuição de Weibull**: Curva PDF com parâmetros k (forma) e c (escala) calculados a partir das estatísticas anuais
- **Painel Analítico (Dashboard)**: Comparação lado a lado de até 3 localizações com gráficos de:
  - Média sazonal (barras)
  - Comparação Weibull (linha com área)
  - Rosa dos Ventos (polar)
  - Perfil vertical (linha)
- **Marcadores de Pin**: Fixe até 3 pontos no mapa para comparação; pins persistem entre as abas e podem ser removidos clicando no marcador ou pelo botão no dashboard
- **Basemap Switcher**: Alterna entre OpenStreetMap, Satélite (Esri) e Dark (CARTO)
- **FAQ e Informações do Projeto**: Painéis deslizantes laterais com explicações

---

## Estrutura do Projeto

```
cnpq-webgis-viewer/
├── public/
│   ├── data/
│   │   ├── bathymetry/           # Shapefiles de batimetria (GeoJSON)
│   │   │   ├── batimetria_0_20_50_75_100m_cured.geojson
│   │   │   ├── batimetria_0_100m_cured.geojson
│   │   │   ├── batimetria_0_100m_estadual_cured.geojson
│   │   │   └── batimetria_subfaixas_estadual_cured.geojson
│   │   ├── cogs/wrf/             # Cloud Optimized GeoTIFFs (~42 MB)
│   │   │   ├── ERA5_atlas/
│   │   │   ├── HIST/
│   │   │   ├── SSP2-4.5/
│   │   │   └── SSP5-8.5/
│   │   │       └── {var}{altura}/
│   │   │           └── {altura}m/
│   │   │               └── {estacao}/
│   │   │                   ├── ..._nacional_completo.tif
│   │   │                   ├── ..._nacional_0_100.tif
│   │   │                   └── ..._{uf}_{faixa}.tif  (17 UFs × 4 faixas)
│   │   └── geoparquet/wrf/       # GeoParquet de consultas analíticas (~228 MB)
│   │       ├── ERA5_atlas/
│   │       ├── HIST/
│   │       ├── SSP2-4.5/
│   │       └── SSP5-8.5/
│   │           └── all_seasons.parquet  (~17-19 MB cada)
│   ├── images/
│   │   └── logos/                # Logomarcas institucionais (servidas estaticamente)
│   │       ├── logo-cnpq.png
│   │       ├── logo-peob-cnpq.png
│   │       └── logo-senai-cimatec.png
│   └── parquet_wasm_bg.wasm     # Runtime WebAssembly para ler Parquet (~6,4 MB)
├── src/
│   ├── components/               # Componentes React
│   │   ├── BasemapSwitcher.tsx   # Seletor de mapa base (Street/Satellite/Dark)
│   │   ├── DashboardView.tsx     # Painel analítico completo (tab B)
│   │   ├── ErrorBoundary.tsx     # Captura de erros React
│   │   ├── FAQPanel.tsx          # Painel FAQ (accordion)
│   │   ├── LandingPage.tsx       # Página inicial institucional (Fase 1)
│   │   ├── LandingPage.css       # Estilos isolados da landing page
│   │   ├── MapView.tsx           # Mapa principal (MapLibre GL + COG + pins)
│   │   ├── MiniMap.tsx           # Mini-mapa embutido no dashboard
│   │   ├── PixelInfoPanel.tsx    # Painel de informações do pixel clicado
│   │   ├── ProfileChart.tsx      # Gráfico de perfil vertical (Chart.js)
│   │   ├── ProjectInfoPanel.tsx  # Painel de informações do projeto
│   │   ├── SidePanel.tsx         # Painel lateral de filtros
│   │   ├── TabBar.tsx            # Barra de abas com botão ← Home
│   │   └── WeibullChart.tsx      # Gráfico de distribuição Weibull (Chart.js)
│   ├── lib/
│   │   ├── cogCatalog.ts         # Catálogo de experimentos, variáveis, alturas, COGs
│   │   ├── cogTileRenderer.ts    # Renderizador de tiles COG (GeoTIFF.js)
│   │   ├── metadata.ts           # Conteúdo editável do FAQ e Project Info
│   │   └── pixelQuery.ts         # Engine de consulta a GeoParquet via WebAssembly
│   ├── App.css                   # Todos os estilos do aplicativo
│   ├── App.tsx                   # Componente raiz com estado global
│   ├── main.tsx                  # Ponto de entrada React
│   └── vite-env.d.ts            # Tipos Vite
├── tests/
│   └── e2e/                      # Testes de regressão E2E (Playwright)
│       ├── 01-landing-page.spec.ts   # 9 testes — seções e conteúdo da landing page
│       ├── 02-navigation.spec.ts     # 8 testes — navegação entre landing e sistema
│       └── 03-responsiveness.spec.ts # 4 testes — layout responsivo (3 breakpoints)
├── docs/
│   ├── INFO_PROJECT.md           # Fonte oficial de metadados do projeto
│   ├── TODO.md                   # Roadmap de desenvolvimento por fases
│   └── plan_LandingPage.md       # Plano de implementação da Fase 1
├── CLAUDE.md                     # Instruções para o assistente de IA (desenvolvimento)
├── index.html                    # HTML de entrada
├── package.json                  # Dependências e scripts
├── playwright.config.ts          # Configuração dos testes E2E
├── tsconfig.json                 # Configuração TypeScript
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts                # Configuração Vite
└── pnpm-lock.yaml                # Lockfile pnpm
```

---

## Datasets

| Experimento | Descrição | Período | Cenário |
|---|---|---|---|
| **ERA5_atlas** | Reanálise ERA5 (ECMWF) com downscaling WRF | 2004–2024 | Histórico observacional |
| **HIST** | WRF Histórico (forçado por ERA5) | 2004–2014 | Histórico simulado |
| **SSP2-4.5** | Projeção CMIP6 SSP2-4.5 com downscaling WRF | 2015–2023 + 2030–2050 | Mitigação moderada (~4,5 W/m²) |
| **SSP5-8.5** | Projeção CMIP6 SSP5-8.5 com downscaling WRF | 2015–2023 + 2030–2050 | Emissões elevadas (~8,5 W/m²) |

### Variáveis

| Sigla | Descrição | Unidade |
|---|---|---|
| `ws` | Velocidade do vento | m/s |
| `wpd` | Densidade de potência eólica | W/m² |

### Alturas do perfil vertical
10 m, 50 m, 100 m, 150 m, 200 m

### Estações sazonais
`ANNUAL` (anual), `DJF` (verão), `MAM` (outono), `JJA` (inverno), `SON` (primavera)

### Resolução espacial
Grade regular de 534 × 263 pontos (~140 mil células), resolução do modelo WRF de ~9 km, regridada para grade lat/lon com espaçamento de ~0,07° (~8 km). Projeção EPSG:4326 (WGS84).

---

## Tecnologias

- **React 18** + **TypeScript** — Framework frontend
- **Vite 6** — Bundler e dev server
- **MapLibre GL JS** — Renderização de mapas (WebGL)
- **Chart.js** + **react-chartjs-2** — Gráficos analíticos
- **parquet-wasm** + **Apache Arrow** — Leitura de GeoParquet no navegador via WebAssembly
- **GeoTIFF.js** — Decodificação de COGs client-side
- **Playwright** — Testes de regressão E2E (dev dependency)

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8

## Instalação e execução

```bash
# 1. Instalar dependências
pnpm install

# 2. Iniciar servidor de desenvolvimento
pnpm dev

# 3. Abrir no navegador
# http://localhost:5173
```

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `pnpm dev` | Inicia servidor de desenvolvimento |
| `pnpm build` | Compila TypeScript e faz build de produção |
| `pnpm preview` | Serve o build de produção localmente |
| `pnpm test` | Roda verificação de tipos + suite completa de testes E2E |
| `pnpm test:types` | Apenas verificação de tipos TypeScript (`tsc --noEmit`) |
| `pnpm test:e2e` | Apenas testes E2E com Playwright (inicia dev server automaticamente) |
| `pnpm test:e2e:ui` | Abre a interface visual do Playwright para depurar testes |

---

## Testes de Regressão E2E

O projeto usa **Playwright** para testes de regressão end-to-end. A suite verifica automaticamente que as funcionalidades existentes continuam funcionando após cada mudança no código.

### Pré-requisito único

Na primeira vez, instale os browsers do Playwright:

```bash
pnpm exec playwright install chromium
```

### Como rodar

```bash
# Recomendado antes de qualquer commit: type check + todos os testes
pnpm test

# Apenas os testes E2E (inicia o dev server automaticamente se necessário)
pnpm test:e2e

# Interface visual — útil para depurar um teste específico
pnpm test:e2e:ui
```

### O que cada arquivo de teste verifica

#### `tests/e2e/01-landing-page.spec.ts` — Conteúdo da Landing Page

| Teste | O que valida | Resultado esperado |
|---|---|---|
| T02 — carregamento inicial | A landing page abre por padrão (não o mapa) | `.landing` visível; `.tab-bar` ausente |
| T03 — título H1 | H1 contém o título oficial do projeto | Texto: "Cenário atual e futuro do recurso eólico offshore no Brasil" |
| NavbarTop | Navbar com botão "Entrar no Sistema" | `.lp-navbar` e `.lp-navbar-enter` visíveis |
| HeroSection | Dois CTAs presentes com textos corretos | `.lp-cta-primary` = "Abrir WebGIS Map"; `.lp-cta-secondary` = "Abrir Analytical Dashboard" |
| StatsStrip | 5 cards de indicadores técnicos | Exatamente 5 elementos `.lp-stat-card` |
| ScenariosSection | 4 cards dos experimentos climáticos | 4 elementos `.lp-scenario-card` com nomes ERA5_atlas, HIST, SSP2-4.5, SSP5-8.5 |
| TeamSection | 17 pesquisadores listados | Exatamente 17 elementos `.lp-team-card` |
| PublicationsSection | 9 publicações científicas | Exatamente 9 elementos `li` em `.lp-pub-list` |
| FooterSection | Disclaimer de dados preliminares | `.lp-footer-disclaimer` contém "preliminares" |
| T09 — logos | 3 logos carregam sem erro HTTP | Todas as respostas `/images/logos/*` com status < 400 |

#### `tests/e2e/02-navigation.spec.ts` — Navegação entre Landing e Sistema

| Teste | O que valida | Resultado esperado |
|---|---|---|
| T04 — CTA primário | "Abrir WebGIS Map" abre o mapa | `.tab-bar` aparece; `.landing` desaparece |
| T05 — CTA secundário | "Abrir Analytical Dashboard" abre o dashboard | `.tab-bar` e `.dashboard-view` visíveis |
| T06 — navbar | "Entrar no Sistema" abre o mapa | `.tab-bar` aparece; `.landing` desaparece |
| T10 — botão Home | `← Home` está no TabBar após navegar | `.tab-home-btn` visível com texto "Home" |
| T11 — volta Home | Clique em `← Home` retorna à landing | `.landing` visível; `.tab-bar` desaparece |
| T11b — Home do dashboard | `← Home` funciona vindo do dashboard | `.landing` visível; `.tab-bar` desaparece |
| T07 — aba ativa | TabBar mantém aba ativa correta | `.tab-btn.active` muda ao clicar entre abas |

#### `tests/e2e/03-responsiveness.spec.ts` — Responsividade

| Teste | O que valida | Resultado esperado |
|---|---|---|
| T08 desktop (1280 px) | Sem scroll horizontal | `scrollWidth` ≤ `clientWidth` |
| T08 tablet (768 px) | Sem scroll horizontal | `scrollWidth` ≤ `clientWidth` |
| T08 mobile (375 px) | Sem scroll horizontal | `scrollWidth` ≤ `clientWidth` |
| T08b — CTAs em coluna | Em mobile, CTAs empilhados verticalmente | Y do CTA secundário > Y do CTA primário |

### Saída esperada ao rodar `pnpm test:e2e`

```
Running 21 tests using 3 workers

  ✓  T02 — landing page é a tela inicial (não o mapa)
  ✓  T03 — H1 contém o título oficial do projeto
  ✓  NavbarTop — logos e botão "Entrar no Sistema" visíveis
  ✓  HeroSection — dois CTAs visíveis
  ✓  StatsStrip — 5 cards de indicadores visíveis
  ✓  ScenariosSection — 4 cards de experimentos visíveis
  ✓  TeamSection — 17 pesquisadores listados
  ✓  PublicationsSection — 9 publicações listadas
  ✓  FooterSection — disclaimer de dados preliminares visível
  ✓  T09 — logos institucionais carregam sem erro (2xx ou 304)
  ✓  T04 — CTA primário "Abrir WebGIS Map" abre o mapa
  ✓  T05 — CTA secundário "Abrir Analytical Dashboard" abre o dashboard
  ✓  T06 — Botão "Entrar no Sistema" na navbar abre o mapa
  ✓  T10 — botão "← Home" está visível no TabBar após navegar para o mapa
  ✓  T11 — clique em "← Home" retorna para a landing page
  ✓  T11b — "← Home" também funciona vindo do dashboard
  ✓  T07 — TabBar mantém aba ativa correta ao alternar entre mapa e dashboard
  ✓  T08 — sem scroll horizontal em desktop (1280px)
  ✓  T08 — sem scroll horizontal em tablet (768px)
  ✓  T08 — sem scroll horizontal em mobile (375px)
  ✓  T08b — em mobile (375 px) os CTAs são exibidos em coluna

  21 passed (~13 s)
```

Se qualquer teste falhar após uma mudança no código, isso indica uma **regressão** — algo que funcionava parou de funcionar. Consulte `CLAUDE.md` para as regras de atualização de testes.

---

## Arquivos-chave para contribuir

| Arquivo | O que faz | Como contribuir |
|---|---|---|
| `src/components/MapView.tsx` | Mapa principal, renderização de COGs, marcadores | Ajustar camadas, eventos, interações |
| `src/components/DashboardView.tsx` | Painel analítico com 4 gráficos | Adicionar/remover gráficos, métricas |
| `src/components/SidePanel.tsx` | Painel lateral com filtros (experimento, variável, altura, etc.) | Adicionar novos filtros ou controles |
| `src/lib/pixelQuery.ts` | Engine de consulta GeoParquet | Otimizar queries, adicionar novas funções de agregação |
| `src/lib/cogCatalog.ts` | Catálogo de experimentos e variáveis | Adicionar novos experimentos, variáveis, alturas |
| `src/lib/cogTileRenderer.ts` | Renderizador de tiles COG | Otimizar performance de renderização |
| `src/lib/metadata.ts` | Textos do FAQ e Informações do Projeto | Editar perguntas/respostas, metadados |
| `src/App.css` | Todos os estilos | Ajustar layout, responsividade, temas |
| `src/components/TabBar.tsx` | Barra de abas | Adicionar novas abas |

---

## Arquitetura de dados

### Fluxo de renderização do COG
```
buildCogUrl() → fetch(tile) → GeoTIFF.parse() → canvas drawImage → addSource('image') → addLayer('raster')
```

### Fluxo de consulta a pixel
```
click no mapa → queryNearest(lat, lon) → busca euclidiana no array de ~140k pixels → retorna PixelDataSummary
```

### Fluxo de dashboard
```
queryDashboardLocation(lat, lon) → agrega estatísticas por estação do allSeasonMap → armazena em pinnedLocations[] → gráficos reativos via useMemo()
```

---

## Notas sobre desenvolvimento

- O estado global (filtros, pins, abas) está centralizado em `App.tsx`
- O GeoParquet é carregado via WebAssembly inteiramente no navegador — não há backend
- O COG não é servido como WMS; cada tile é decodificado e pintado em um canvas, depois carregado como imagem no MapLibre
- Para adicionar um novo experimento, edite `cogCatalog.ts` (tipo `Dataset`, array `DATASETS`, label) e adicione os dados em `public/data/cogs/wrf/` e `public/data/geoparquet/wrf/`
- Os dados brutos estão armazenados em formato NetCDF no diretório `data/raw/` (~1,7 TB)

> **⚠️ Aviso importante:** Os dados contidos em `public/data/` (COGs e GeoParquet) são **preliminares** e destinam-se exclusivamente ao desenvolvimento e validação do frontend. Os datasets finais, otimizados para performance de consulta e produção, serão publicados em versão futura do repositório.

---

## Licença

Dados: [Creative Commons Attribution](https://creativecommons.org/licenses/by/4.0/)
Código: [MIT](LICENSE)
