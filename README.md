# CNPq WebGIS — Recurso Eólico Offshore

> **Cenário atual e futuro do recurso eólico offshore no Brasil: ferramentas e aplicações**
> Projeto CNPq 407949/2022-4 · CS2I — SENAI CIMATEC · 2024–2026

Visualizador geográfico interativo para dados de vento e densidade de potência eólica offshore, baseado em simulações climáticas regionais WRF-ARW v4 com downscaling para ~9 km de resolução (~0,07° de grade) e projeções CMIP6 (SSP2-4.5 e SSP5-8.5).

> **⚠️ Dados preliminares:** Os arquivos em `public/data/` (COGs e GeoParquet) são destinados exclusivamente ao desenvolvimento e validação do frontend. Os datasets finais, otimizados para produção, serão publicados em versão futura.

---

## Funcionalidades

### Landing Page institucional

- **NavbarTop** — logo PEOB/CNPq, links de âncora para seções (Metodologia, Cenários, Interface, Equipe, Publicações) e botão "Entrar no Sistema"
- **HeroSection** — título oficial, CTAs primário (WebGIS Map) e secundário (Analytical Dashboard)
- **StatsStrip** — 5 indicadores técnicos em destaque
- **Resumo Técnico** — texto descritivo + tabela de parâmetros do modelo
- **Cenários Simulados** — 4 cards com diferenciação visual entre cenários históricos (verde) e futuros (vermelho)
- **Visualizações** — galeria de cards clicáveis com descrição de cada ferramenta
- **Equipe** — 17 pesquisadores com destaque visual para coordenador e líderes
- **Publicações** — 9 publicações científicas em cards escaneáveis
- **Footer** — logos institucionais, citação oficial e disclaimer de dados

### Sistema de análise

- **Mapa Interativo (WebGIS)** — COGs de velocidade do vento e densidade de potência sobre 3 basemaps (Street, Satellite, Dark)
- **Filtros** — Experimento × Variável × Altura × Estação × Estado × Faixa batimétrica
- **Perfil Vertical** — velocidade do vento em 10, 50, 100, 150 e 200 m para um ponto clicado
- **Distribuição de Weibull** — curva PDF com parâmetros k (forma) e c (escala)
- **Painel Analítico (Dashboard)** — comparação de até 3 localizações com 4 gráficos sobrepostos (média sazonal, Weibull, rosa dos ventos, perfil vertical)
- **Marcadores de Pin** — até 3 pontos fixados; persistem entre abas
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
27 passed (~14 s)
```

### Cobertura de testes

| Arquivo | Testes | Contexto |
|---|---|---|
| `01-landing-page.spec.ts` | 9 | Seções, contagens de elementos, logos |
| `02-navigation.spec.ts` | 7 | CTAs, navbar, botão `← Home`, persistência de aba |
| `03-responsiveness.spec.ts` | 4 | Scroll horizontal nos 3 breakpoints (1280/768/375 px) |
| `04-scroll-and-inpage-nav.spec.ts` | 6 | Scroll vertical, âncoras, botão "Voltar ao topo" |

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

**`02-navigation.spec.ts`**

| Teste | O que valida |
|---|---|
| T04 | CTA primário abre o mapa |
| T05 | CTA secundário abre o dashboard |
| T06 | "Entrar no Sistema" abre o mapa |
| T10 | Botão `← Home` visível no TabBar |
| T11 | `← Home` retorna à landing |
| T11b | `← Home` funciona vindo do dashboard |
| T07 | Aba ativa persiste ao alternar mapa/dashboard |

**`03-responsiveness.spec.ts`**

| Teste | O que valida |
|---|---|
| T08 desktop (1280 px) | `scrollWidth` ≤ `clientWidth` |
| T08 tablet (768 px) | `scrollWidth` ≤ `clientWidth` |
| T08 mobile (375 px) | `scrollWidth` ≤ `clientWidth` |
| T08b | CTAs empilhados verticalmente em mobile |

**`04-scroll-and-inpage-nav.spec.ts`**

| Teste | O que valida |
|---|---|
| T20 | `window.scrollY` aumenta após `scrollBy` |
| T21 | `scrollHeight` > `clientHeight` |
| T22 | Navbar contém 5 links `.lp-nav-anchor` |
| T23 | Seções têm IDs `metodologia`, `cenarios`, `interface`, `equipe`, `publicacoes` |
| T24 | Botão `.lp-back-to-top` oculto no carregamento |
| T25 | Botão `.lp-back-to-top` visível após scroll |

---

## Estrutura do Projeto

```
cnpq-offshore-wind-webgis/
├── public/
│   ├── data/
│   │   ├── bathymetry/           # Shapefiles de batimetria (GeoJSON)
│   │   ├── cogs/wrf/             # Cloud Optimized GeoTIFFs (~42 MB)
│   │   │   ├── ERA5_atlas/
│   │   │   ├── HIST/
│   │   │   ├── SSP2-4.5/
│   │   │   └── SSP5-8.5/
│   │   └── geoparquet/wrf/       # GeoParquet de consultas analíticas (~228 MB)
│   │       └── {experimento}/all_seasons.parquet
│   ├── images/logos/             # Logomarcas (CNPq, PEOB, SENAI CIMATEC)
│   └── parquet_wasm_bg.wasm      # Runtime WebAssembly para leitura de Parquet
├── src/
│   ├── components/
│   │   ├── LandingPage.tsx       # Página inicial institucional
│   │   ├── LandingPage.css       # Estilos isolados da landing page
│   │   ├── MapView.tsx           # Mapa principal (MapLibre GL + COG + pins)
│   │   ├── DashboardView.tsx     # Painel analítico
│   │   ├── SidePanel.tsx         # Filtros laterais
│   │   ├── TabBar.tsx            # Barra de abas + botão ← Home
│   │   ├── PixelInfoPanel.tsx    # Painel de informações do pixel
│   │   ├── ProfileChart.tsx      # Perfil vertical (Chart.js)
│   │   ├── WeibullChart.tsx      # Distribuição de Weibull (Chart.js)
│   │   ├── MiniMap.tsx           # Mini-mapa no dashboard
│   │   ├── BasemapSwitcher.tsx   # Seletor de mapa base
│   │   ├── FAQPanel.tsx          # Painel FAQ (accordion)
│   │   ├── ProjectInfoPanel.tsx  # Painel de informações do projeto
│   │   └── ErrorBoundary.tsx     # Captura de erros React
│   ├── lib/
│   │   ├── cogCatalog.ts         # Catálogo de experimentos, variáveis, alturas
│   │   ├── cogTileRenderer.ts    # Renderizador de tiles COG (GeoTIFF.js)
│   │   ├── metadata.ts           # Conteúdo do FAQ e Project Info
│   │   └── pixelQuery.ts         # Engine de consulta GeoParquet via WebAssembly
│   ├── App.tsx                   # Componente raiz com estado global
│   ├── App.css                   # Estilos do sistema (mapa, dashboard, drawers)
│   └── main.tsx                  # Ponto de entrada React
├── tests/e2e/
│   ├── 01-landing-page.spec.ts   # 9 testes — conteúdo da landing page
│   ├── 02-navigation.spec.ts     # 7 testes — navegação landing ↔ sistema
│   ├── 03-responsiveness.spec.ts # 4 testes — layout responsivo (3 breakpoints)
│   └── 04-scroll-and-inpage-nav.spec.ts  # 6 testes — scroll e âncoras
├── docs/
│   ├── INFO_PROJECT.md           # Fonte oficial de metadados (equipe, parâmetros, citação)
│   ├── TODO.md                   # Roadmap por fases
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
| MapLibre GL JS | — | Renderização do mapa (WebGL) |
| Chart.js + react-chartjs-2 | — | Gráficos analíticos |
| parquet-wasm + Apache Arrow | — | Leitura de GeoParquet via WebAssembly |
| GeoTIFF.js | — | Decodificação de COGs client-side |
| Playwright | ^1.52.0 | Testes de regressão E2E |

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
queryDashboardLocation(lat, lon) → agrega por estação via allSeasonMap
                                 → pinnedLocations[] → gráficos reativos
```

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
