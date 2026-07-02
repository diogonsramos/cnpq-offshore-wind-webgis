# CNPq WebGIS — Recurso Eólico Offshore

> **Cenário atual e futuro do recurso eólico offshore no Brasil: ferramentas e aplicações**
> Projeto CNPq 407949/2022-4 · CS2I — SENAI CIMATEC · 2024–2026

Visualizador geográfico interativo para dados de vento e densidade de potência eólica offshore, baseado em simulações climáticas regionais **WRF-ARW v4** e **MPAS** com downscaling para ~9 km de resolução (~0,07° de grade) e projeções CMIP6 (SSP2-4.5 e SSP5-8.5).

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

### WebGIS Map

- **Multi-modelo** — suporte a WRF e MPAS com seletor no painel lateral
- **COG overlay** — velocidade do vento (ws) e densidade de potência (wpd) em 10, 50, 100, 150, 200 m
- **5 basemaps** — Street, Satellite, Dark (mais opções em desenvolvimento)
- **Consulta por pixel** — clique no mapa para ver estatísticas (média, min, max, std), parâmetros Weibull e perfil vertical
- **Distância da costa** — exibida no painel de informações do pixel
- **Shapefiles de batimetria** — ZEE Nacional/Estadual, plataforma continental, subfaixas

### Analytical Dashboard

- **Comparação multi-localidade** — até 3 pontos simultâneos com cores dedicadas
- **Gráficos interativos (Plotly)** — média sazonal, distribuição Weibull, rosa dos ventos, perfil vertical (velocidade + potência)
- **Entrada manual de coordenadas** — latitude/longitude via teclado
- **MiniMapa** — visão geral com pins clicáveis

### Tecnologia

- **Navegação sem react-router** — estado gerenciado por `useState<TabId>` em `App.tsx`
- **Dados via WebAssembly** — parquet-wasm + Apache Arrow para consultas de ~140k pixels em < 1 ms
- **Cache IndexedDB** — parquets armazenados localmente para recarga instantânea

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
41 passed (~17 s)   <!-- atualizar quando novos testes forem adicionados (f08) -->
```

### Cobertura de testes

| Arquivo | Testes | Contexto |
|---|---|---|
| Arquivo | Testes | Contexto |
|---|---|---|
| `01-landing-page.spec.ts` | 12 | Seções, contagens de elementos, logos |
| `02-navigation.spec.ts` | 9 | CTAs, navbar, botão `← Home`, persistência de aba |
| `03-responsiveness.spec.ts` | 4 | Scroll horizontal nos 3 breakpoints (1280/768/375 px) |
| `04-scroll-and-inpage-nav.spec.ts` | 6 | Scroll vertical, âncoras, botão "Voltar ao topo" |
| `05-team-and-faq.spec.ts` | 10 | Avatares, links Lattes, FAQ accordion |
| `06-map.spec.ts` | — | WebGIS Map (adicionar em f08) |
| `07-dashboard.spec.ts` | — | Analytical Dashboard (adicionar em f08) |
| `08-sidepanel.spec.ts` | — | SidePanel filters (adicionar em f08) |
| `09-stability.spec.ts` | — | Console error tracking (adicionar em f08) |
| `10-performance.spec.ts` | — | Load time checks (adicionar em f08) |

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
│   │   ├── bathymetry/           # Shapefiles de batimetria (GeoJSON)
│   │   ├── cogs/                 # Cloud Optimized GeoTIFFs
│   │   │   ├── wrf/              #   WRF: ERA5_atlas, HIST, SSP2-4.5, SSP5-8.5
│   │   │   └── mpas/             #   MPAS (em desenvolvimento)
│   │   ├── geoparquet/           # GeoParquet para consultas analíticas
│   │   │   ├── wrf/{exp}/season={s}/data.parquet
│   │   │   └── mpas/{exp}/season={s}/data.parquet
│   │   └── shp/                  # Shapefiles: ZEE, batimetria
│   ├── images/
│   │   ├── logos/                # CNPq, PEOB, SENAI CIMATEC
│   │   ├── team/                 # Fotos dos 17 pesquisadores
│   │   └── screenshots/          # Screenshots do sistema (adicionar em f07)
│   └── parquet_wasm_bg.wasm      # Runtime WebAssembly para leitura de Parquet
├── src/
│   ├── components/
│   │   ├── LandingPage.tsx/.css   # Página inicial institucional
│   │   ├── MapView.tsx           # Mapa principal (MapLibre GL + COG + pins)
│   │   ├── DashboardView.tsx     # Painel analítico (Plotly)
│   │   ├── SidePanel.tsx         # Filtros laterais (modelo, experimento, etc.)
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
│   ├── i18n/                     # Traduções pt-BR/EN (adicionar em f06)
│   │   ├── pt-BR.ts
│   │   ├── en.ts
│   │   ├── provider.tsx
│   │   └── types.ts
│   ├── App.tsx                   # Componente raiz com estado global
│   ├── App.css                   # Estilos do sistema (mapa, dashboard, drawers)
│   └── main.tsx                  # Ponto de entrada React
├── tests/
│   ├── e2e/                      # Testes de regressão (Playwright)
│   │   ├── 01-landing-page.spec.ts
│   │   ├── 02-navigation.spec.ts
│   │   ├── 03-responsiveness.spec.ts
│   │   ├── 04-scroll-and-inpage-nav.spec.ts
│   │   ├── 05-team-and-faq.spec.ts
│   │   ├── 06-map.spec.ts        # adicionar em f08
│   │   ├── 07-dashboard.spec.ts  # adicionar em f08
│   │   ├── 08-sidepanel.spec.ts  # adicionar em f08
│   │   ├── 09-stability.spec.ts  # adicionar em f08
│   │   └── 10-performance.spec.ts# adicionar em f08
│   └── load/                     # Testes de carga (k6) — adicionar em f08
│       └── load-test.js
├── docs/
│   ├── INFO_PROJECT.md           # Fonte oficial de metadados
│   ├── TODO.md                   # Roadmap consolidado por fases
│   ├── TODO_f01_dashboard-controls.md   # Feature branches roadmap
│   ├── TODO_f02_dashboard-charts.md
│   ├── TODO_f03_ui-enhancements.md
│   ├── TODO_f04_performance.md
│   ├── TODO_f05_code-quality.md
│   ├── TODO_f06_i18n.md
│   ├── TODO_f07_screenshots.md
│   ├── TODO_f08_tests.md
│   └── BENCHMARKS.md             # Resultados de load testing (adicionar em f08)
├── CLAUDE.md                     # Instruções de desenvolvimento para IA e humanos
├── playwright.config.ts          # Configuração E2E (base URL: localhost:3000)
├── vite.config.ts                # Dev server na porta 3000
└── package.json
```

---

## Datasets

| Experimento | Descrição | Período | Cenário |
|---|---|---|---|
| Experimento | Modelo | Período | Cenário |
|---|---|---|---|---|
| **ERA5_atlas_historico** | WRF/MPAS | 2004–2024 | Reanálise (referência) |
| **ERA5_atlas_presente** | WRF/MPAS | 2004–2024 | Reanálise (presente) |
| **HIST_historico** | WRF/MPAS | 2004–2014 | Histórico simulado (bias correction) |
| **SSP2-4.5_presente** | WRF/MPAS | 2015–2023 | Mitigação moderada (~4,5 W/m²) |
| **SSP2-4.5_futuro** | WRF/MPAS | 2030–2050 | Mitigação moderada (~4,5 W/m²) |
| **SSP5-8.5_presente** | WRF/MPAS | 2015–2023 | Emissões elevadas (~8,5 W/m²) |
| **SSP5-8.5_futuro** | WRF/MPAS | 2030–2050 | Emissões elevadas (~8,5 W/m²) |

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

| Tecnologia | Uso |
|---|---|---|
| React 18 + TypeScript 5 | Framework frontend com tipagem estática |
| Vite 6 | Bundler e dev server (porta 3000) |
| MapLibre GL JS | Renderização do mapa (WebGL) |
| Plotly.js + react-plotly.js | Gráficos do dashboard (sazonal, Weibull, rosa dos ventos, perfil) |
| Chart.js + react-chartjs-2 | Gráficos compactos (perfil vertical, Weibull no PixelInfoPanel) |
| parquet-wasm + Apache Arrow | Leitura de GeoParquet via WebAssembly |
| GeoTIFF.js | Decodificação de COGs client-side |
| Playwright | Testes de regressão E2E |
| k6 | Testes de carga (f08) |

---

## Arquitetura

### Fluxo de renderização COG

[Diagrama conceitual da arquitetura](docs/ARCHITECTURE.md) (em desenvolvimento)

```
                            ┌──────────────────┐
                            │    App.tsx        │
                            │  useState<TabId>  │
                            └───────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
      ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
      │  LandingPage │     │   MapView    │     │  DashboardView   │
      │  (home)      │     │  (map)       │     │  (dashboard)     │
      └──────────────┘     └──────┬───────┘     └────────┬─────────┘
                                  │                      │
                          ┌───────┴───────┐       ┌──────┴──────┐
                          │   SidePanel   │       │    MiniMap  │
                          │  cogCatalog   │       │  PixelQuery │
                          │  pixelQuery   │       │  Plotly ch. │
                          └───────────────┘       └─────────────┘
```

---

## Roadmap de desenvolvimento

O projeto segue um fluxo de **branches sequenciais** com review obrigatório antes do merge no `main`:

```
main ── PR#1 (f01) ── merge ── PR#2 (f02) ── merge ── ...
         ↑ revisão                ↑ revisão
```

Cada feature branch tem um arquivo `docs/TODO_fNN_NAME.md` com especificações completas para implementação via Claude Code:

| Ordem | Branch | Feature |
|---|---|---|---|
| f01 | `feat/dashboard-controls` | Seletores de experimento/modelo, opacidade COG, comparação multi-experimento/modelo, **GeoParquet Explorer (filtros espaciais)** |
| f02 | `feat/dashboard-charts` | Weibull, WPD profile, heatmap |
| f03 | `feat/ui-enhancements` | Export CSV, fullscreen, basemaps, export imagem |
| f04 | `feat/performance` | Lazy Plotly, cache eviction |
| f05 | `feat/code-quality` | useReducer, CSS modules, tipos |
| f06 | `feat/i18n` | Internacionalização pt-BR/EN |
| f07 | `feat/screenshots` | Screenshots reais na landing page |
| f08 | `feat/tests` | E2E + load + security + hardening |

### Fluxo de contribuição

1. **Planeje** — consulte `docs/TODO_fNN_NAME.md` da branch
2. **Crie a branch** — `git checkout -b feat/nome-da-feature`
3. **Implemente** — siga as especificações no TODO; rode `pnpm test` antes de commitar
4. **Commite** — mensagens no formato `feat: descrição concisa`, `fix:`, `docs:`
5. **PR** — abra Pull Request para `main` com descrição das mudanças
6. **Revise** — aguarde aprovação do revisor
7. **Merge** — squash merge no `main`
8. **Próximo** — o desenvolvedor seguinte cria a branch a partir do `main` atualizado

### Casos específicos

| Para | Faça |
|---|---|
| Adicionar experimento | Edite `cogCatalog.ts` (tipo `Dataset`, `DATASETS`, labels) + adicione dados em `public/data/cogs/` |
| Editar FAQ/Project Info | Edite `src/lib/metadata.ts`. Use `docs/INFO_PROJECT.md` como fonte de verdade |
| Adicionar screenshot | Adicione em `public/images/screenshots/` e referencie no `LandingPage.tsx` |
| Corrigir dependência vulnerável | `pnpm audit` → corrija ou documente exceção com expiração |

### Arquivos de referência

| Arquivo | Contém |
|---|---|
| `docs/INFO_PROJECT.md` | Metadados oficiais: equipe, parâmetros, experimentos, citação |
| `docs/TODO.md` | Roadmap consolidado (fases e resultados de testes) |
| `docs/TODO_f01.md` … `docs/TODO_f08.md` | Especificações detalhadas de cada feature branch |
| `docs/BENCHMARKS.md` | Resultados de testes de carga (f08) |
| `CLAUDE.md` | Instruções de desenvolvimento para IA |
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
