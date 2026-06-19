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
│   └── parquet_wasm_bg.wasm     # Runtime WebAssembly para ler Parquet (~6,4 MB)
├── src/
│   ├── components/               # Componentes React
│   │   ├── BasemapSwitcher.tsx   # Seletor de mapa base (Street/Satellite/Dark)
│   │   ├── DashboardView.tsx     # Painel analítico completo (tab B)
│   │   ├── ErrorBoundary.tsx     # Captura de erros React
│   │   ├── FAQPanel.tsx          # Painel FAQ (accordion)
│   │   ├── MapView.tsx           # Mapa principal (MapLibre GL + COG + pins)
│   │   ├── MiniMap.tsx           # Mini-mapa embutido no dashboard
│   │   ├── PixelInfoPanel.tsx    # Painel de informações do pixel clicado
│   │   ├── ProfileChart.tsx      # Gráfico de perfil vertical (Chart.js)
│   │   ├── ProjectInfoPanel.tsx  # Painel de informações do projeto
│   │   ├── SidePanel.tsx         # Painel lateral de filtros
│   │   ├── TabBar.tsx            # Barra de abas (Map / Dashboard)
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
├── index.html                    # HTML de entrada
├── package.json                  # Dependências e scripts
├── tsconfig.json                 # Configuração TypeScript
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts                # Configuração Vite
├── pnpm-lock.yaml                # Lockfile pnpm
└── METADADOS.md                  # Documentação dos metadados (opcional)
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
