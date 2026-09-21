# CNPq WebGIS — Offshore Wind Resource (v1.0)

> **Current and future scenario of the offshore wind resource in Brazil: tools and applications**  
> CNPq Project 407949/2022-4 · CS2I — SENAI CIMATEC · 2024–2026

Interactive WebGIS and Analytical Dashboard platform for exploring offshore wind speed and wind power density data. Based on regional climate simulations (WRF-ARW v4 / MPAS) with high-resolution downscaling (~9 km / 0.07°) and CMIP6 climate projections (SSP2-4.5 and SSP5-8.5 scenarios).

---

## 🎯 Main Features

### 1. Institutional Landing Page
- **Hero Section & Global Header:** Modern design featuring Call-to-Actions (CTAs) for system access. The Header includes anchored navigation, an internationalized locale toggle (BR, US, ES), and useful links.
- **Technical Summary:** Specifications of grids, physical parameters, and methodologies (WRF vs. MPAS).
- **Publications and Team:** List of project researchers (with links to Lattes curricula) and derived scientific papers.
- **Internationalized FAQ:** Technical questions and answers regarding the modeling and tool usage.

### 2. Interactive Map (WebGIS)
- **Fast COG Rendering:** Visualization of *Cloud Optimized GeoTIFF* rasters directly in the browser using `geotiff.js` and `MapLibre GL`.
- **Basemaps & Overlays Control:** 6 basemap options (Satellite, Dark, Terrain, etc.) with dynamic controls moved to a clean, efficient Side Panel.
- **Native Screenshot:** Export map canvas captures including meta-information watermarks (model, experiment, season, and variable).
- **Mini-Pixel Panel:** Point-based querying over any offshore location, revealing quick statistics and mini-charts (Vertical Profile, Weibull, and Wind Rose) developed entirely with *Plotly.js*.

### 3. Vertical Analytical Dashboard
- **Multidimensional Analysis:** Fast extraction and cross-referencing of geospatial and temporal data via a WebAssembly engine (`parquet-wasm`) reading *GeoParquet*.
- **Location Comparison:** Select up to 3 "pins" on the map to view and compare Vertical Profile curves (WS and WPD), Weibull PDFs, and Wind Roses (Plotly).
- **Geospatial Filters:** Advanced filtering of raw data by **State** (SC, RJ, BA, etc.), **Distance from Coast**, and **Bathymetry Zone**, generating aggregated statistics (Mean, Median, Standard Deviation) in real-time (< 200ms).

---

## 🛠️ Technology Stack

- **Frontend Core:** React 18, Vite, TypeScript
- **Mapping & GIS:** MapLibre GL JS, geotiff.js
- **Data & Analytics:** Apache Arrow, parquet-wasm (WebAssembly), DuckDB (Planned)
- **Charts:** Plotly.js (`react-plotly.js`) — *Fully migrated in v1.0, eliminating Chart.js*
- **Internationalization:** Custom `i18n` system (Strict typing for pt-BR, en-US, and es-ES)
- **Testing (QA):** Playwright (End-to-End Tests)

---

## 🚀 Installation and Execution (Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [pnpm](https://pnpm.io/) (version 8 or higher)

### Main Commands

```bash
# 1. Install dependencies
pnpm install

# 2. Start the development server
pnpm dev
# The system will be running at http://localhost:5173 or a similar port
```

### Other Useful Scripts
| Command | Description |
|---|---|
| `pnpm build` | Compiles TS and creates the Vite production build |
| `pnpm test:full` | Runs linting, security audits, type checking (tsc), and E2E tests |
| `pnpm test:e2e` | Runs the full Playwright suite (starts the server automatically) |
| `pnpm test:e2e:ui` | Opens the interactive Playwright UI for debugging |
| `pnpm lint:security` | Checks for potential static vulnerabilities using eslint-plugin-security |

---

## 🧪 Quality Assurance & Testing (E2E)

The project maintains a robust *End-to-End* testing infrastructure via **Playwright**. Before pushing any changes to the `main` branch, it is mandatory to ensure the application has not suffered regressions.

### Suite Structure
The tests are located in the `tests/e2e/` folder and cover all critical functionalities:
- Conditional rendering of the Responsive layout (`03-responsiveness.spec.ts`)
- Landing Page components and i18n (`01-landing-page`, `12-i18n`)
- Global state-based routing navigation (`02-navigation`, `04-scroll-and-inpage-nav`)
- Interactive tests of Dashboard selectors, layers, and tools (`06` through `10`)

*Remember to run `pnpm exec playwright install chromium` the first time you run the tests on your machine.*

---

## 🌐 Internationalization (i18n)

The WebGIS uses a native system built with *React Context* and *TypeScript*, ensuring strict typing for translation keys.
To add or edit content:
1. Open the files in the `src/i18n/` folder (`pt-BR.ts`, `en.ts`, `es.ts`).
2. The types in the Portuguese file (`pt-BR.ts`) dictate the structure that all other language files must strictly follow.

---

## 📁 Directory Structure (Overview)

```text
cnpq-offshore-wind-webgis/
├── public/               # Static assets, logos, SVGs, and data files (COGs/GeoParquet)
├── src/
│   ├── components/       # React UI Components (WebGIS, Dashboard, Landing Page)
│   ├── i18n/             # Translation dictionaries and React Context Provider
│   ├── lib/              # Business logic, data catalog, WebAssembly, and query engines
│   └── App.tsx           # System entry point containing the global state
├── tests/e2e/            # Playwright test files
├── docs/                 # Documentation for project phases and historical roadmaps
```

> **Data Notice:** Files in the `public/data/` subfolder listed in the repository are exclusively intended for frontend validation and testing. The official scientific production database will be integrated on specific servers during the final release.
