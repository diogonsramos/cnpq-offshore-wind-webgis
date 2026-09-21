# CNPq WebGIS — Recurso Eólico Offshore (v1.0)

> **Cenário atual e futuro do recurso eólico offshore no Brasil: ferramentas e aplicações**
> Projeto CNPq 407949/2022-4 · CS2I — SENAI CIMATEC · 2024–2026

Plataforma WebGIS e Analytical Dashboard interativos para exploração de dados de velocidade do vento e densidade de potência eólica offshore. Baseado em simulações climáticas regionais (WRF-ARW v4 / MPAS) com *downscaling* para alta resolução (~9 km / 0,07°) e projeções climáticas CMIP6 (cenários SSP2-4.5 e SSP5-8.5).

---

## 🎯 Funcionalidades Principais

### 1. Landing Page Institucional
- **Hero Section & Header Global:** Design moderno com CTAs para acesso ao sistema. O Header inclui navegação ancorada, controle internacionalizado de idioma (BR, US, ES) e links úteis.
- **Resumo Técnico:** Especificações das grades, parâmetros físicos e metodologias (WRF vs MPAS).
- **Publicações e Equipe:** Lista de pesquisadores integrantes do projeto (com links para Lattes) e artigos científicos derivados.
- **FAQ Internacionalizado:** Perguntas e respostas técnicas sobre a modelagem e o uso da ferramenta.

### 2. Mapa Interativo (WebGIS)
- **Renderização Rápida de COGs:** Visualização de rasters *Cloud Optimized GeoTIFF* diretamente no navegador usando `geotiff.js` e `MapLibre GL`.
- **Controle de Basemaps & Overlays:** 6 opções de mapa base (Satellite, Dark, Terrain, etc.) com controles dinâmicos transferidos para um Painel Lateral (SidePanel) limpo e eficiente.
- **Screenshot Nativo:** Exportação de capturas do canvas do mapa contendo meta-informações (modelo, experimento, estação e variável).
- **Mini-Painel de Pixel:** Consulta pontual sobre qualquer localização offshore, revelando estatísticas rápidas e mini-gráficos (Perfil Vertical, Weibull e Rosa dos Ventos) desenvolvidos inteiramente com *Plotly.js*.

### 3. Dashboard Vertical Analítico
- **Análise Multidimensional:** Extração rápida e cruzamento de dados geoespaciais e temporais via motor WebAssembly (`parquet-wasm`) lendo *GeoParquet*.
- **Comparação de Locais:** Seleção de até 3 "pins" no mapa para visualizar e comparar curvas de Perfil Vertical (WS e WPD), PDF Weibull e Rosa dos Ventos (Plotly).
- **Filtros Geoespaciais:** Filtragem avançada dos dados brutos por **Estado** (SC, RJ, BA, etc.), **Distância da Costa** e **Faixa de Batimetria**, gerando estatísticas agregadas (Média, Mediana, Desvio Padrão) em tempo real (< 200ms).

---

## 🛠️ Stack Tecnológico

- **Frontend Core:** React 18, Vite, TypeScript
- **Mapping & GIS:** MapLibre GL JS, geotiff.js
- **Data & Analytics:** Apache Arrow, parquet-wasm (WebAssembly), DuckDB (Planejado)
- **Gráficos:** Plotly.js (`react-plotly.js`) — *Totalmente migrado na v1.0, eliminando Chart.js*
- **Internacionalização:** Sistema próprio `i18n` (Tipagem rígida em pt-BR, en-US e es-ES)
- **Testes (QA):** Playwright (Testes End-to-End)

---

## 🚀 Instalação e Execução (Desenvolvimento)

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [pnpm](https://pnpm.io/) (versão 8 ou superior)

### Comandos Principais

```bash
# 1. Instalar as dependências
pnpm install

# 2. Iniciar o servidor de desenvolvimento
pnpm dev
# O sistema estará rodando em http://localhost:5173 ou porta similar
```

### Outros Scripts Úteis
| Comando | Descrição |
|---|---|
| `pnpm build` | Compila o TS e faz o build de produção via Vite |
| `pnpm test:full` | Roda linting, verificação de segurança, validação de tipos (tsc) e testes E2E |
| `pnpm test:e2e` | Roda a suíte completa do Playwright (inicia o server automaticamente) |
| `pnpm test:e2e:ui` | Abre a interface visual interativa do Playwright para depuração |
| `pnpm lint:security` | Verifica potenciais vulnerabilidades estáticas usando eslint-plugin-security |

---

## 🧪 Qualidade e Testes (E2E)

O projeto mantém uma robusta infraestrutura de testes *End-to-End* via **Playwright**. Antes de subir qualquer alteração para a branch `main`, é obrigatório garantir que a aplicação não sofreu regressão.

### Estrutura da Suíte
Os testes estão localizados na pasta `tests/e2e/` e cobrem todas as funcionalidades críticas:
- Renderização condicional do layout Responsivo (`03-responsiveness.spec.ts`)
- Componentes da Landing Page e i18n (`01-landing-page`, `12-i18n`)
- Navegação entre rotas baseada em estado global (`02-navigation`, `04-scroll-and-inpage-nav`)
- Testes interativos dos seletores, camadas e ferramentas do Dashboard (`06` a `10`)

*Lembre-se de rodar `pnpm exec playwright install chromium` na primeira vez que for rodar os testes em sua máquina.*

---

## 🌐 Internacionalização (i18n)

O WebGIS utiliza um sistema nativo construído com *React Context* e *TypeScript*, assegurando tipagem rígida nas chaves de tradução.
Para adicionar ou editar conteúdos:
1. Abra os arquivos na pasta `src/i18n/` (`pt-BR.ts`, `en.ts`, `es.ts`).
2. Os tipos no arquivo de português (`pt-BR.ts`) ditam a estrutura que todos os outros arquivos de idioma devem seguir estritamente.

---

## 📁 Estrutura de Diretórios (Resumo)

```text
cnpq-offshore-wind-webgis/
├── public/               # Assets estáticos, logos, SVG e arquivos de dados (COGs/GeoParquet)
├── src/
│   ├── components/       # Componentes React de Interface (WebGIS, Dashboard, Landing Page)
│   ├── i18n/             # Dicionários de tradução e o Provider do React Context
│   ├── lib/              # Lógica de negócio, catálogo de dados, WebAssembly e query engines
│   └── App.tsx           # Ponto de entrada do sistema contendo o estado global
├── tests/e2e/            # Arquivos de teste do Playwright
├── docs/                 # Documentações de fases e roadmaps históricos do projeto
```

> **Aviso de Dados:** Arquivos na subpasta `public/data/` listados no repositório destinam-se exclusivamente para validação e testes do frontend. O banco de dados científico oficial de produção será integrado em servidores específicos durante o release final.
