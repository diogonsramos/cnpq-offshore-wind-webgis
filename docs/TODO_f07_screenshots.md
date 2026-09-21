# f07 — screenshots

## Goal

1. **Update LandingPage static content** to reflect the current multi-model (WRF+MPAS), 7-dataset catalog, and expanded height profile.
2. **Replace placeholder gallery cards** with real screenshots of the final improved UI.

## Prerequisites

This feature **must** be implemented **after** f01–f06 are merged into `main`. The screenshots must capture the **final improved UI** — with proper model/experiment selectors, charts, opacity control, fullscreen, and i18n.

## Files to modify

- `src/components/LandingPage.tsx` — update STATS, SCENARIOS, TECH_TABLE_ROWS, hero text + replace gallery cards with `<img>` tags
- `src/components/LandingPage.css` — styles for screenshot images
- `src/lib/metadata.ts` — update FAQ answers and PROJECT_INFO to reflect WRF+MPAS and 7 datasets
- `public/images/screenshots/` (new directory — add WebP files)

## Screenshots to capture

| # | What to capture | How |
|---|---|---|
| 1 | **WebGIS Map — full view** | Open map with COG overlay, sidebar visible, pixel info panel open showing wind data for a coastal pixel near RN/CE |
| 2 | **WebGIS Map — multi-basemap** | Same view but with Satellite basemap active |
| 3 | **WebGIS Map — bathymetry** | Show shapefile layers (ZEE Nacional) toggled on |
| 4 | **Analytical Dashboard — seasonal bars** | Dashboard with 2 locations pinned, seasonal bar chart visible |
| 5 | **Analytical Dashboard — all charts** | Scroll view showing Weibull, wind rose, vertical profile (wind + power density) with data visible |
| 6 | **Analytical Dashboard — fullscreen chart** | One chart expanded in fullscreen mode |
| 7 | **Mobile responsive** | 375px viewport showing landing page hero + stats (using Chrome DevTools) |
| 8 | **FAQ / Project Info drawer** | SidePanel with FAQ drawer open, showing first 3 questions expanded |

## Part 1 — Update static content on LandingPage

The following sections in `src/components/LandingPage.tsx` contain outdated text that must be updated to reflect the current application state (after f01–f06). All experiment names must use **scientifically correct labels** without underscores or internal filenames (e.g., `'ERA5 histórico'` instead of `'ERA5_atlas_historico'`).

### 1.1 — STATS strip (lines 10–16)

Replace entirely. Remove "Estados costeiros", change "Experimentos" to "Períodos":

```ts
const STATS = [
  { value: 'WRF v4.6.0 · MPAS v8.1.0', label: 'Modelos atmosféricos' },
  { value: '9 km', label: 'Resolução horizontal' },
  { value: 'ERA5 · CMIP6', label: 'Base de dados' },
  { value: 'Histórico · Presente · Futuro', label: 'Períodos' },
  { value: '10 · 50 · 100 · 150 · 200 m', label: 'Alturas de saída' },
]
```

### 1.2 — SCENARIOS cards (lines 20–60)

Replace with 6 cards organized by **period** (not by dataset filename). Use clear, reader-friendly labels:

| Período | Base de dados | Descrição |
|---|---|---|
| **Histórico** (2004–2014) | ERA5 | Downscaling WRF/MPAS forçado pela reanálise ERA5 |
| **Histórico** (2004–2014) | CMIP6 BC HIST | Downscaling WRF/MPAS forçado pelo CMIP6 BC histórico (18 modelos, Xu et al. 2021) |
| **Presente** (2015–2023) | ERA5 | Downscaling WRF/MPAS forçado pela reanálise ERA5 |
| **Presente** (2015–2023) | CMIP6 BC SSP2-4.5 | Downscaling WRF/MPAS — cenário de mitigação moderada |
| **Presente** (2015–2023) | CMIP6 BC SSP5-8.5 | Downscaling WRF/MPAS — cenário de emissões elevadas |
| **Futuro** (2030–2050) | CMIP6 BC SSP2-4.5 | Downscaling WRF/MPAS — cenário de mitigação moderada |
| **Futuro** (2030–2050) | CMIP6 BC SSP5-8.5 | Downscaling WRF/MPAS — cenário de emissões elevadas |

The `kind` field should be `'historical'` for the first two and `'future'` for the rest. Use `ScenarioKind = 'historical' | 'future'`.

Implement as:
```ts
const SCENARIOS = [
  {
    icon: '🔵', name: 'ERA5 Histórico', forcing: 'ERA5',
    period: '2004–2014', kind: 'historical' as const,
    desc: 'Downscaling WRF/MPAS forçado pela reanálise ERA5 — referência observacional para o período histórico',
  },
  {
    icon: '📊', name: 'CMIP6 BC Histórico', forcing: 'CMIP6 BC (18 modelos)',
    period: '2004–2014', kind: 'historical' as const,
    desc: 'Downscaling WRF/MPAS forçado pelo CMIP6 bias corrected (Xu et al. 2021) — período histórico',
  },
  {
    icon: '🔵', name: 'ERA5 Presente', forcing: 'ERA5',
    period: '2015–2023', kind: 'future' as const,
    desc: 'Downscaling WRF/MPAS forçado pela reanálise ERA5 — período presente de referência',
  },
  {
    icon: '🟡', name: 'CMIP6 BC SSP2-4.5 Presente', forcing: 'CMIP6 BC (18 modelos)',
    period: '2015–2023', kind: 'future' as const,
    desc: 'Downscaling WRF/MPAS — cenário de mitigação moderada (~4,5 W/m²) para o período presente',
  },
  {
    icon: '🔴', name: 'CMIP6 BC SSP5-8.5 Presente', forcing: 'CMIP6 BC (18 modelos)',
    period: '2015–2023', kind: 'future' as const,
    desc: 'Downscaling WRF/MPAS — cenário de emissões elevadas (~8,5 W/m²) para o período presente',
  },
  {
    icon: '🟡', name: 'CMIP6 BC SSP2-4.5 Futuro', forcing: 'CMIP6 BC (18 modelos)',
    period: '2030–2050', kind: 'future' as const,
    desc: 'Downscaling WRF/MPAS — cenário de mitigação moderada (~4,5 W/m²) para o período futuro',
  },
  {
    icon: '🔴', name: 'CMIP6 BC SSP5-8.5 Futuro', forcing: 'CMIP6 BC (18 modelos)',
    period: '2030–2050', kind: 'future' as const,
    desc: 'Downscaling WRF/MPAS — cenário de emissões elevadas (~8,5 W/m²) para o período futuro',
  },
]
```

The legend must change from "Histórico / Referência" / "Projeção Futura" to "ERA5 (observacional)" / "CMIP6 BC (climático)".

### 1.3 — Hero section (lines 177–193)

**Hero description (line 182):**
Current: `Downscaling dinâmico WRF-ARW v4 (~9 km) forçado por ERA5 e CMIP6...`
Change to:
```
Downscaling dinâmico WRF v4.6.0 e MPAS v8.1.0 (~9 km) forçado por ERA5 e CMIP6 BC (SSP2-4.5 e SSP5-8.5) para mapear vento e densidade de potência eólica em 5 altitudes (10, 50, 100, 150, 200 m) na costa brasileira.
```

### 1.4 — Tech Summary table (TECH_TABLE_ROWS, lines 100–109)

Replace with updated rows:

```ts
const TECH_TABLE_ROWS = [
  ['Modelos atmosféricos', 'WRF-ARW v4.6.0 (Weather Research and Forecasting) e MPAS v8.1.0 (Model for Prediction Across Scales)'],
  ['Domínios aninhados (WRF)', 'D01: 27 km (América do Sul); D02: 9 km (costa brasileira)'],
  ['Grade MPAS', 'Malha global com refinamento regional para ~9 km sobre a costa brasileira'],
  ['Pontos de grade (frontend)', '~250.000 pontos após regridagem para grade lat/lon ~0,08°'],
  ['Condições de contorno', 'ERA5 (reanálise ECMWF, ~31 km) e CMIP6 BC (Xu et al. 2021, ~139 km, 18 modelos) bias corrected'],
  ['Níveis verticais', '51 níveis (sigma/pressão híbrida)'],
  ['Alturas pós-processadas', '10, 50, 100, 150, 200 m (obtidas pela lei da potência com parâmetros atmosféricos do modelo)'],
  ['Variáveis (frontend)', 'Velocidade do vento — ws (m/s); Densidade de potência — wpd (W/m²)'],
  ['Períodos', 'Histórico (2004–2014), Presente (2015–2023), Futuro (2030–2050)'],
  ['Volume bruto de entrada', '~20 TB (ERA5: 15 TB; CMIP6 BC: 5,4 TB)'],
  ['Produtos processados', '700 COGs; GeoParquet por experimento e modelo'],
]
```

### 1.5 — Tech Summary paragraphs (lines 214–242)

Rewrite the four paragraphs in this exact order:

**Paragraph 1 — Apresentação do projeto:**
```
O projeto realiza o mapeamento do potencial eólico offshore brasileiro utilizando simulações climáticas regionais de alta resolução com dois modelos atmosféricos distintos, considerando cenários atuais e futuros de mudanças climáticas. O conjunto de dados cobre três períodos — histórico (2004–2014), presente (2015–2023) e futuro (2030–2050) — forçados pela reanálise ERA5 (ECMWF) e pelo CMIP6 BC (Xu et al. 2021, doi: 10.1038/s41597-021-01079-3), um conjunto bias corrected de 18 modelos climáticos globais.
```

**Paragraph 2 — Relevância:**
```
A energia eólica offshore é uma fronteira estratégica para a transição energética brasileira. No entanto, a avaliação precisa do recurso eólico requer dados de alta resolução espacial e temporal que capturem a complexidade da circulação atmosférica na costa brasileira, incluindo fenômenos como brisas marítimas, jatos de baixos níveis e interações com a topografia costeira.
```

**Paragraph 3 — Downscaling WRF e MPAS:**
```
As simulações foram conduzidas com os modelos WRF-ARW v4.6.0 (Weather Research and Forecasting) e MPAS v8.1.0 (Model for Prediction Across Scales). O WRF utiliza dois domínios aninhados: D01 (27 km) cobrindo a América do Sul e D02 (9 km) focado na costa brasileira, abrangendo os 17 estados costeiros. O MPAS opera com malha global de resolução variável, com refinamento para ~9 km sobre a região de interesse, eliminando a necessidade de domínios aninhados e permitindo a representação consistente de teleconexões atmosféricas.
```

**Paragraph 4 — Dados de entrada e saída:**
```
As condições de contorno provêm de duas bases: ERA5 (reanálise global do ECMWF, resolução original de ~31 km) e CMIP6 BC (Xu et al. 2021), que fornece dados bias corrected de 18 modelos CMIP6 para os cenários SSP2-4.5 (mitigação moderada) e SSP5-8.5 (emissões elevadas) com resolução original de ~1,25°. Ambos os conjuntos de entrada foram padronizados para ~9 km após o downscaling dinâmico.
```

**Paragraph 5 — Períodos:**
```
O conjunto de dados abrange três períodos: histórico (2004–2014, forçado por ERA5 e CMIP6 BC HIST), presente (2015–2023, forçado por ERA5 e CMIP6 BC SSP2-4.5/SSP5-8.5) e futuro (2030–2050, forçado por CMIP6 BC SSP2-4.5/SSP5-8.5). O período 2015–2023 foi simulado para fins de treinamento dos modelos de machine learning para bias correction ajustado à costa brasileira (processamento em andamento).
```

**Paragraph 6 — Funcionalidades do sistema:**
```
As variáveis disponíveis no frontend — velocidade do vento (ws, m/s) e densidade de potência eólica (wpd, W/m²) — são servidas em formato COG (Cloud Optimized GeoTIFF) para visualização no mapa interativo e GeoParquet para consultas espaciais eficientes. O sistema permite consultar estatísticas por pixel (média, mínimo, máximo, desvio padrão, parâmetros de Weibull, rosa dos ventos e perfil vertical em 5 altitudes), comparar até 3 localizações no dashboard analítico e exportar dados. Futuras atualizações incluirão a versão com bias correction QDM (Quantile Delta Mapping) dos resultados.
```

### 1.6 — Team section (lines 324–371)

**Remove the collapse behavior.** All 17 members must be displayed by default. Delete the `lp-team-grid--collapsed` class toggle logic and the `showAllTeam` state:

- Remove `const [showAllTeam, setShowAllTeam] = useState(false)` (line 127)
- Remove the conditional class: `className={`lp-team-grid${showAllTeam ? '' : ' lp-team-grid--collapsed'}`}` → just `className="lp-team-grid"`
- Remove the `<button className="lp-team-toggle">` element entirely
- Update the E2E test `T26` (in `tests/e2e/01-landing-page.spec.ts`) — it currently checks for `.lp-team-toggle` visibility and `aria-expanded`. These tests must be removed or updated.

### 1.7 — Gallery section (lines 289–321)

Replace the current 3 placeholder cards with cards that include both the screenshot image overlay (Part 2) and a new card for MPAS-specific visualization. Keep the total at 3 cards (WebGIS Map / Dashboard — Perfil / Dashboard — Dashboard Geral) or expand to 4 if a dedicated MPAS card is desired.

### 1.8 — New section: Parametrizações Físicas

Add a new section between "Cenários Simulados" and "Visualizações do Sistema" (or as a subsection of Tech Summary) with a table of physical parameterizations common to both models:

| Componente | Configuração |
|---|---|
| Microfísica | WRF Single-Moment 6-class (WSM6) |
| Convecção | New Tiedtke |
| Radiação de Onda Longa | RRTMG |
| Radiação de Onda Curta | RRTMG shortwave |
| Camada Limite Planetária (PBL) | YSU |
| Camada de Superfície | Revised MM5 Monin-Obukhov |
| Física de Superfície (LSM) | Noah Land Surface Model |

Title suggestion: "Configurações Físicas Compartilhadas". Note: WRF uses suite "tropical", MPAS uses "mesoscale_reference", but both share the same physical options above.

### 1.9 — New section: Centros e Instituições Parceiras

Add a new section (e.g., "Instituições Parceiras") between Publicações and FAQ (or after FAQ, before Footer), containing:

**Centro de Ciências Atmosféricas — SENAI CIMATEC:**
- Supercomputação, cloud e cibersegurança: https://senaicimatec.com.br/servico/supercomputacao-cloud-e-ciberseguranca/
- Grupo de Pesquisa CNPq: http://dgp.cnpq.br/dgp/espelhogrupo/1792812078303607
- CPA-IA (Centro de Pesquisa Aplicada em Inteligência Artificial): https://cpaia.senaicimatec.com.br/pt

**Instituições parceiras:**
- Instituto Nacional de Pesquisas Espaciais — INPE
- NVIDIA
- NCAR/EUA — National Center for Atmospheric Research

### 1.10 — Publications (PUBLICATIONS array, lines 88–98)

The current array has 9 entries. Add the following new publications, checking for duplicates **by title**:

**Already present (keep):**
1. WEYLL, A. L. C. et al. **Mapeamento eólico offshore histórico e futuro usando Quantile Delta Mapping...** (XI SAPCT e X ICPAD, 2026)
2. RAMOS, D. N. S. et al. **MPAS-A OR WRF: WHICH IS THE BETTER WIND DOWNSCALING TOOL...** (I SIEME, 2025)
3. AYLAS, G. Y. R. et al. **ANALYZING HEAT WAVE IMPACTS ON ELECTRICITY DEMAND...** (I SIEME, 2025)
4. PIRES, W. M. S. et al. **APPLICATION OF THE MPAS-A MODEL IN EXTREME WIND EVENTS...** (I SIEME, 2025)
5. WEYLL, A. L. C. et al. **WIND SPEED BIAS CORRECTION FOR OFFSHORE WIND ENERGY...** (I SIEME, 2025)
6. WEYLL, A. L. C. et al. **Correção de bias aplicada ao WRF com modelos clássicos de machine learning.** (X SAPCT, 2025)
7. PIRES, W. M. S. et al. **Análise e filtragem da quantidade de dados de entrada...** (X SAPCT, 2025)
8. AYLAS, G. Y. R. et al. **Análise do potencial energético eólico offshore no Brasil para o ano de 2030...** (X SAPCT, 2025) — check for duplicate with the new papers below
9. PIRES, W. M. S. et al. **Cenário atual e futuro do recurso eólico offshore no Brasil...** (IX SAPCT, 2024)

**New papers to add (check for duplicates by title first):**
- AYLAS, G.Y.R.; PIRES, W. M. S. et al. **Análise do potencial energético eólico offshore no Brasil para o ano de 2030 através de modelagem numérica.** In: X SAPCT, 2025, Salvador. — **DUPLICATE** of existing #8 above (same title, same authors, same event). DO NOT add.
- AYLAS, G.Y.R. et al. **ANALYZING HEAT WAVE IMPACTS ON ELECTRICITY DEMAND AND THERMAL STRESS: A STUDY WITH MPAS-A MODEL IN BAURU-SP.** In: I SIEME, 2025. — **DUPLICATE** of existing #3 above. DO NOT add.
- AYLAS, G. Y. R. et al. **Simulação do campo de vento em áreas de topografia complexa: análise comparativa entre os modelos WRF e MPAS-A.** In: X SAPCT, 2025. — **NEW.** Add.

So only **1 new publication** to add:
```tsx
<>AYLAS, G. Y. R. et al. <strong>Simulação do campo de vento em áreas de topografia complexa: análise comparativa entre os modelos WRF e MPAS-A.</strong> In: X SAPCT, 2025, Salvador.</>
```

Total after dedup: **10 publications**.

### 1.11 — FAQ — Complete rewrite of `src/lib/metadata.ts` FAQS array

Replace the entire FAQS array with corrected answers. Below are the 21 questions with corrected answers:

**Q1 — Fontes de dados:**
"Dados de vento dos modelos WRF (Weather Research and Forecasting) e MPAS (Model for Prediction Across Scales) forçados pela reanálise ERA5 do ECMWF e pelo CMIP6 BC (Xu et al. 2021, doi: 10.1038/s41597-021-01079-3), um conjunto bias corrected de 18 modelos climáticos globais CMIP6 para os cenários SSP2-4.5 e SSP5-8.5, com downscaling dinâmico para ~9 km de resolução."

**Q2 — Resolução espacial:**
"Os dados de entrada ERA5 possuem resolução original de ~0,25° (~31 km) e o CMIP6 BC de ~1,25° (~139 km). Após downscaling dinâmico com WRF e MPAS, ambos foram padronizados para ~9 km de resolução (~0,08° de grade). Grade regridada para projeção EPSG:4326 (WGS84) com aproximadamente 250 mil pontos de grade."

**Q3 — Resolução temporal:**
"Saídas 6-horárias (00Z, 06Z, 12Z, 18Z) para todo o período simulado de cada experimento."

**Q4 — Experimentos disponíveis:**
"4 bases de dados (ERA5, CMIP6 HIST, CMIP6 SSP2-4.5 e CMIP6 SSP5-8.5) classificadas em 3 períodos: histórico (2004–2014), presente (2015–2023) e futuro (2030–2050), totalizando 7 experimentos, cada um processado com os modelos WRF e MPAS."

**Q5 — Tamanho total dos dados:**
"O volume total de dados de entrada utilizados no downscaling foi de aproximadamente 20 TB, sendo 15 TB de dados ERA5 e 5,4 TB de dados CMIP6 BC preparados para WRF (3,2 TB) e MPAS (2,2 TB). Os COGs têm entre 1 e 5 MB cada."

**Q6 — Variáveis disponíveis:**
"Velocidade do vento (ws) em m/s e densidade de potência eólica (wpd) em W/m². Os valores nas alturas acima de 10 m (50, 100, 150 e 200 m) foram obtidos pela lei da potência no pós-processamento, utilizando parâmetros atmosféricos diretamente do modelo, como densidade do ar, e validados com medições in situ em diferentes locais offshore e próximos da costa brasileira."

**Q7 — Faixas batimétricas:**
"Divisão da plataforma continental brasileira em 4 faixas de profundidade: 0–20 m (interna), 20–50 m (média), 50–100 m (externa) e a faixa unificada 0–100 m (plataforma total)."

**Q8 — Origem dos shapefiles:**
"Bases públicas como LEPLAC (Programa de Levantamento da Plataforma Continental), IBGE, EPE (Empresa de Pesquisa Energética) e outras fontes governamentais. Reprojetados para EPSG:4326 com codificação UTF-8."

**Q9 — UFs costeiras:**
"17 estados: AL (Alagoas), AP (Amapá), BA (Bahia), CE (Ceará), ES (Espírito Santo), MA (Maranhão), PA (Pará), PB (Paraíba), PE (Pernambuco), PI (Piauí), PR (Paraná), RJ (Rio de Janeiro), RN (Rio Grande do Norte), RS (Rio Grande do Sul), SC (Santa Catarina), SE (Sergipe), SP (São Paulo). Todos possuem dados estatísticos para cada variável do vento e altura."

**Q10 — Parâmetro Weibull k:**
"Descreve a dispersão da distribuição de velocidades do vento. k < 2 indica alta variabilidade; k entre 2 e 3 é típico de ventos costeiros; k > 3 indica ventos mais estáveis."

**Q11 — Parâmetro Weibull c:**
"Proporcional à velocidade média do vento. Quanto maior c, maior a velocidade característica. A relação é: média = c · Γ(1 + 1/k), onde Γ é a função gama."

**Q12 — Cálculo do Weibull:**
"Método dos Momentos: k = (σ / média)^(−1,086), c = média / Γ(1 + 1/k). Utiliza a média e o desvio padrão anuais da velocidade do vento."

**Q13 — O que é um COG:**
"Cloud Optimized GeoTIFF — formato de raster GeoTIFF otimizado para renderização progressiva via HTTP Range Requests. Os COGs são os dados visualizados no mapa interativo e estão disponíveis para download na plataforma Zotero do projeto."

**Q14 — Quantos COGs existem:**
"Aproximadamente 700 COGs, resultado de 2 modelos (WRF, MPAS) × 7 experimentos × 2 variáveis (ws, wpd) × 5 alturas (10, 50, 100, 150, 200 m) × 5 estações (annual, djf, mam, jja, son). Cada COG tem entre 1 e 5 MB."

**Q15 — Cenários futuros:**
"SSP2-4.5 (cenário de mitigação moderada, forçamento radiativo de ~4,5 W/m²) e SSP5-8.5 (cenário de emissões elevadas, ~8,5 W/m²) do CMIP6 BC, com downscaling dinâmico via WRF e MPAS para os períodos presente (2015–2023) e futuro (2030–2050)."

**Q16 — Período dos dados históricos:**
"Tanto ERA5 quanto CMIP6 BC HIST cobrem o período 2004–2014 (11 anos)."

**Q17 — Período das projeções futuras:**
"SSP2-4.5 e SSP5-8.5 cobrem o período futuro de 2030–2050. O período 2015–2023 foi também submetido a downscaling dinâmico para fins de treinamento dos modelos de machine learning para bias correction ajustado para a costa brasileira. O processamento dos resultados com bias correction QDM está em andamento."

**Q18 — GeoParquet contém séries temporais completas?**
"Não. O GeoParquet armazena apenas estatísticas agregadas por estação (ANNUAL, DJF, MAM, JJA, SON) — média, mínimo, máximo e desvio padrão da velocidade do vento e densidade de potência — além dos parâmetros de Weibull (k e c), rosa dos ventos (frequência por 16 setores direcionais) e perfil vertical (médias em 5 altitudes: 10, 50, 100, 150 e 200 m). Para séries temporais completas (dados 6-horários) é necessário consultar os arquivos NetCDF originais (~1,7 TB no total)."

**Q19 — Como funciona a consulta por pixel:**
"O GeoParquet é carregado na memória via WebAssembly (parquet-wasm + Apache Arrow) e cacheado no IndexedDB para consultas offline. Ao clicar no mapa, o frontend calcula a distância euclidiana até todos os pixels válidos (~250k pontos) e retorna o pixel mais próximo com todas as estatísticas (5 alturas × 2 variáveis × 5 estações × rosa dos ventos × perfil vertical × Weibull) em menos de 1 ms. Os dados carregados são vinculados ao experimento e modelo selecionados."

**Q20 — Parametrizações físicas:**
"O WRF utiliza a suíte 'tropical' e o MPAS a suíte 'mesoscale_reference', ambas compartilhando as mesmas opções de configurações físicas: microfísica WSM6, convecção New Tiedtke, radiação RRTMG (longa e curta), PBL YSU, camada de superfície Revised MM5 Monin-Obukhov e LSM Noah."

**Q21 — Como citar este projeto:**
"CENÁRIO ATUAL E FUTURO DO RECURSO EÓLICO OFFSHORE NO BRASIL. WebGIS de Energia Eólica Offshore. Brasília: CNPq, 2026. Disponível em: [URL da aplicação]. Acesso em: [data de acesso]."

### 1.12 — PROJECT_INFO updates in `src/lib/metadata.ts`

- Line 49–60: Replace `techSummary` array with values matching section 1.4 table above
- Line 62: `'Pesquisadores do CS2I — SENAI CIMATEC, Salvador, BA.'`
- Line 63–65: Update publications list to match the 10 deduplicated papers

### 1.13 — E2E test updates

The following existing tests will break and must be updated in `tests/e2e/01-landing-page.spec.ts`:

| Test ID | Current assertion | Update to |
|---|---|---|
| T08 (ScenariosSection) | 4 `.lp-scenario-card` | 7 `.lp-scenario-card` |
| T26 | `.lp-team-toggle` exists with text "Ver todos os 17 pesquisadores" | **Remove** — toggle no longer exists |
| T27 | Click toggle changes `aria-expanded` | **Remove** — toggle no longer exists |
| T33 | Exactly 20 `.lp-faq-item` | 21 `.lp-faq-item` (new parameterization question) |

### Test expectations for Part 1

- [ ] `pnpm test:types` passes
- [ ] Updated E2E tests pass with corrected counts
- [ ] Old T26, T27, T08 assertions updated
- [ ] All 17 team cards visible on load (no collapse)
- [ ] HTML validates without structural issues

---

## Part 2 — Replace gallery cards with real screenshots

(unchanged from original)

## Technical specs for images

- Format: **WebP** (modern, smaller) with PNG fallback for old browsers
- Max width: **1200px** (retina @2x: 2400px but downsized)
- File naming: `screenshot-01-webgis-map.webp`, `screenshot-02-satellite.webp`, etc.
- Use `srcset` for responsive loading: `<img src="screenshot-01.webp" srcset="screenshot-01@2x.webp 2x" ...>`
- Alt text: descriptive, in English and Portuguese (use `t('landing.gallery.img_alt_01')` after i18n from f06)
- File size target: < 200 KB each (use `cwebp` or Squoosh to compress)

## Gallery card layout update

Current cards are styled gradient placeholders. After this feature:

```tsx
<div className="lp-gallery-card">
  <img
    src={`${BASE_URL}images/screenshots/screenshot-01.webp`}
    alt={t('landing.gallery.img_alt_01')}
    className="lp-gallery-screenshot"
    loading="lazy"
  />
  <div className="lp-gallery-card-overlay">
    <span className="lp-gallery-card-title">WebGIS Map</span>
    <span className="lp-gallery-card-desc">Visualize COG layers and query pixel data</span>
  </div>
</div>
```

- The image fills the card background (`object-fit: cover`)
- On hover, a semi-transparent overlay with title + description appears
- Clicking navigates to the respective tab (existing behavior)

## Acceptance criteria

### Part 1 (content updates)

- [ ] STATS shows: WRF v4.6.0 · MPAS v8.1.0, 9 km, ERA5 · CMIP6, Histórico · Presente · Futuro, 5 alturas
- [ ] SCENARIOS shows exactly 7 cards organized by period with reader-friendly names (no underscores)
- [ ] Hero description mentions WRF v4.6.0, MPAS v8.1.0, CMIP6 BC, 5 altitudes
- [ ] TECH_TABLE_ROWS updated: dual model row, 20 TB input volume, 700 COGs, CMIP6 BC reference
- [ ] Six Tech Summary paragraphs in correct order (apresentação, relevância, downscaling, dados, períodos, funcionalidades)
- [ ] Team section: all 17 members visible on load, collapse toggle removed
- [ ] Gallery: screenshot overlay implemented (Part 2)
- [ ] New section "Configurações Físicas" with parameterization table
- [ ] New section "Instituições Parceiras" with SENAI CIMATEC, INPE, NVIDIA, NCAR
- [ ] Publications: 10 entries after deduplication (1 new added, 2 duplicates rejected)
- [ ] FAQ: all 21 answers corrected (WRF+MPAS, 20 TB, 700 COGs, CMIP6 BC reference, law-of-power heights, parameterization table)
- [ ] FAQ Q20 (parametrizações físicas) added with full table
- [ ] FAQ Q21 (citação) updated with correct format
- [ ] PROJECT_INFO techSummary matches updated model/dataset/period information
- [ ] `pnpm test` passes: T08 updated (4→7 scenario cards), T26/T27 removed (team toggle gone), T33 updated (20→21 FAQ items)

### Part 2 (screenshots)

- [ ] All 8 screenshots exist in `public/images/screenshots/` as WebP (with PNG copies for compatibility)
- [ ] Each screenshot shows real data, not mockups
- [ ] Screenshots reflect the UI **after** f01–f06 improvements
- [ ] Gallery cards display images with lazy loading
- [ ] Hover overlay with title works (accessibility: focus-visible too)
- [ ] Page load performance: Lighthouse audit shows no layout shift from images
- [ ] Placeholder CSS kept as fallback for missing images

## What to avoid

- No screenshots with console errors visible in DevTools
- No outdated screenshots if the UI changes again (update when needed)
- No oversized files bloating the repo (keep < 200 KB per image)

## Claude Code constraints

- No `any`, no `// @ts-ignore`
- Images are committed to the repo (they are small and part of the app)
- Use `<picture>` element if PNG fallback is needed for Safari/old browsers
- Do not delete the gradient placeholder CSS — keep it as a fallback for missing screenshots using `.lp-gallery-card:has(img:not([src]))` or similar
