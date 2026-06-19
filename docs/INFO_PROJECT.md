# INFO_PROJECT.md — Fonte Oficial de Metadados do Projeto

> **Documento de referência** para atualizar os painéis FAQ, Informações do Projeto e Landing Page do frontend WebGIS.
> Atualizado conforme o Relatório Final do Projeto (Processo 407949/2022-4).

---

## 1. Metadados do Projeto

| Campo | Valor |
|---|---|
| **Título oficial** | Cenário atual e futuro do recurso eólico offshore no Brasil: ferramentas e aplicações |
| **Processo CNPq** | 407949/2022-4 |
| **Chamada** | CHAMADA CNPQ/MCTI 25/2022 - Linha 2 |
| **Coordenador** | Davidson Martins Moreira |
| **Instituição executora** | Centro de Supercomputação para Inovação Industrial — CS2I. Campus Integrado de Manufatura e Tecnologia — SENAI CIMATEC, Salvador — Bahia, Brasil |
| **Período de execução** | 2024–2026 |

---

## 2. Equipe de Pesquisadores

| Nome | Função |
|---|---|
| Davidson Martins Moreira | Coordenador |
| Diogo Nunes da Silva Ramos | Pesquisador Líder |
| Allan Rodrigues Silva | Pesquisador Líder |
| Thalyta Soares dos Santos | Pesquisadora |
| Francisco José de Lopes Lima | Pesquisador |
| Wendy Mary da Silveira Pires | Pesquisadora |
| Georgynio Yossimar Rosales Aylas | Pesquisador |
| Arthur Lúcide Cotta Weyll | Pesquisador |
| Luan Santos de Oliveira Silva | Pesquisador |
| Marcelo Pizzuti Pes | Pesquisador |
| Ana Paula Paes dos Santos | Pesquisadora |
| William Duarte Jacondino | Pesquisador |
| Hallan Souza de Jesus | Pesquisador |
| Yasmin Kaore Lago Kitagawa | Pesquisadora |
| Rosiberto Salustiano da Silva Júnior | Pesquisador |
| Allan Cavalcante Araujo | Pesquisador |
| Sofia Alexandrino Lage | Pesquisadora |

---

## 3. Fomento e Apoio Institucional

- **Órgão financiador:** Conselho Nacional de Desenvolvimento Científico e Tecnológico (CNPq)
- **Processo:** 407949/2022-4
- **Instituição de execução:** CS2I — SENAI CIMATEC, Salvador, BA
- **Logomarcas institucionais disponíveis em:**
  - `docs/logo-cnpq.png`
  - `docs/logo-peob-cnpq.png`
  - `docs/logo-senai-cimatec.png`

---

## 4. Resumo Técnico (Frontend — Landing Page / FAQ)

O projeto realiza o mapeamento do potencial eólico offshore brasileiro utilizando simulações climáticas regionais de alta resolução, considerando cenários atuais e futuros de mudanças climáticas.

### Em uma frase:
> Downscaling dinâmico WRF (~9 km) forçado por ERA5 e CMIP6 (SSP2-4.5 e SSP5-8.5) para mapear vento e densidade de potência eólica em 5 altitudes na costa brasileira.

### Números principais:

| Indicador | Valor |
|---|---|
| Modelo atmosférico | WRF-ARW v4 (Weather Research and Forecasting) |
| Domínios aninhados | D01: 27 km de resolução; D02: 9 km de resolução |
| Pontos de grade (D02) | 388 × 553 (~214.000 células) |
| Grade regridada (frontend) | 534 × 263 (~140.000 células, ~0,07°) |
| Níveis verticais | 51 níveis (sigma/pressão híbrida) |
| Alturas de saída | 10 m, 50 m, 100 m, 150 m, 200 m |
| Variáveis (frontend COG) | Velocidade do vento — `ws` (m/s); Densidade de potência — `wpd` (W/m²) |
| Condições de contorno | ERA5 (reanálise); CMIP6 SSP2-4.5 e SSP5-8.5 (projeções) |
| Resolução temporal | 6-horária (00Z, 06Z, 12Z, 18Z) |
| Períodos simulados | ERA5_atlas: 2004–2024; HIST: 2004–2014; Futuro: 2015–2023 + 2030–2050 |
| Nº de experimentos | 4 (ERA5_atlas, HIST, SSP2-4.5, SSP5-8.5) |
| Volume bruto | ~1,7 TB em NetCDF |
| Produtos processados | ~5.688 COGs (~42 MB total); 24 GeoParquet (~228 MB total) |
| Estados costeiros | 17 (AL, AP, BA, CE, ES, MA, PA, PB, PE, PI, PR, RJ, RN, RS, SC, SE, SP) |
| Faixas batimétricas | 0–20 m (interna), 20–50 m (média), 50–75 m (externa), 75–100 m (profunda) |

---

## 5. Configuração dos Modelos Atmosféricos

### 5.1. WRF (Weather Research and Forecasting)

| Parâmetro | Esquema Selecionado | Opção WRF |
|---|---|---|
| Microfísica | WRF Single-Moment 6-class (WSM6) | `mp_physics = 6` |
| Convecção | New Tiedtke | `cu_physics = 16` |
| Radiação de Onda Longa | RRTMG | `ra_lw_physics = 4` |
| Radiação de Onda Curta | RRTMG | `ra_sw_physics = 4` |
| Camada Limite Planetária (PBL) | YSU | `bl_pbl_physics = 1` |
| Camada de Superfície | Revised MM5 Monin-Obukhov | `sf_sfclay_physics = 1` |
| Modelo de Superfície (LSM) | Noah Land Surface Model | `sf_surface_physics = 2` |

### 5.2. MPAS (Model for Prediction Across Scales)

| Parâmetro | Esquema Selecionado |
|---|---|
| Convecção | New Tiedtke |
| Microfísica | WSM6 |
| Superfície Terrestre | Noah |
| Camada Limite | YSU |
| Camada de Superfície | Revised Monin-Obukhov |
| Radiação de Onda Longa | RRTMG |
| Radiação de Onda Curta | RRTMG |
| Fração de Nuvens p/ Radiação | Xu-Randall |
| Arrasto de Onda Gravitacional | YSU |

---

## 6. Domínio e Grade — Comparativo WRF vs MPAS

| Parâmetro | WRF | MPAS |
|---|---|---|
| **Tipo de Grade** | Cartesiana estruturada, Arakawa C, projeção Mercator | Voronoi não estruturada (malhas hexagonais) |
| **Resolução Horizontal** | D01: 27 km; D02: 9 km | ~10 km (quase uniforme) |
| **Pontos Horizontais** | D01: 256 × 235; D02: 388 × 553 | Definidos pela malha de entrada |
| **Níveis Verticais** | 51 | 51 |
| **Topo do Domínio** | 5000 Pa (p_top_requested) | 30000 m (config_ztop) |
| **Passo de Tempo** | 90 s | 70 s |
| **Intervalo de Saída** | 360 min | 6 h |
| **Intervalo de Entrada** | 21600 s | 6 h |
| **Restart** | Desativado | Desativado |
| **Nudging** | Desativado (grid_fdda = 0) | Desativado (IAU = off) |
| **Condições de Contorno** | Ativadas (specified) | Ativadas (apply_lbcs) |
| **Coeficiente de Damping** | 0,2 | 0,2 |
| **Altura de Damping** | 5000 m | 22000 m |

---

## 7. Experimentos e Cenários Climáticos

### 7.1. Datasets de Forçante

| Dataset | Fonte | Resolução Original | Frequência |
|---|---|---|---|
| ERA5 | ECMWF Reanalysis v5 | ~27 km (0,25°) | Horária |
| CMIP6 GCMbc | 18-model ensemble bias-corrected | ~140 km (1,25°) | 6-horária |

### 7.2. Experimentos WRF

| Experimento | Forçante | Período | Descrição |
|---|---|---|---|
| **ERA5_atlas** | ERA5 | 2004–2024 | Reanálise com downscaling WRF (cenário atual) |
| **HIST** | ERA5 | 2004–2014 | WRF Histórico (período de treinamento para bias correction) |
| **SSP2-4.5** | CMIP6 (18-model ensemble) | 2015–2023 + 2030–2050 | Cenário de mitigação moderada (~4,5 W/m²) |
| **SSP5-8.5** | CMIP6 (18-model ensemble) | 2015–2023 + 2030–2050 | Cenário de emissões elevadas (~8,5 W/m²) |

### 7.3. Correção de Viés (Bias Correction)

- **Método principal:** Quantile Delta Mapping (QDM) — preserva tendências climáticas de longo prazo
- **Período de treinamento:** 2004–2014 (CMIP6 vs ERA5)
- **Anos de projeção corrigidos:** 2030, 2035, 2040, 2050
- **Machine Learning (experimental):** Regressão Linear, Extra Trees, Gradient Boosting, Random Forest, XGBoost, CatBoost — aplicados ponto a ponto nos ~60.000 pontos de grade (D01)

### 7.4. Ensemble CMIP6 (18 Modelos)

| # | Modelo | Instituição | Resolução |
|---|---|---|---|
| 1 | ACCESS-CM2 | CSIRO (Austrália) | 1,875°×1,25° |
| 2 | ACCESS-ESM1-5 | CSIRO (Austrália) | 1,875°×1,25° |
| 3 | CanESM5 | CCCma (Canadá) | 2,81°×2,81° |
| 4 | BCC-CSM2-MR | BCC (China) | 1,125°×1,125° |
| 5 | FGOALS-f3-L | IAP/CAS (China) | 1,25°×1° |
| 6 | FGOALS-g3 | IAP/CAS (China) | 2°×2,25° |
| 7 | EC-Earth3 | EC-Earth Consortium (Europa) | 0,70°×0,70° |
| 8 | EC-Earth3-Veg | EC-Earth Consortium (Europa) | 0,70°×0,70° |
| 9 | IPSL-CM6A-LR | IPSL (França) | 2,5°×1,26° |
| 10 | AWI-CM-1-1-MR | AWI (Alemanha) | 0,94°×0,94° |
| 11 | MPI-ESM1-2-HR | MPI-M (Alemanha) | 0,94°×0,94° |
| 12 | MPI-ESM1-2-LR | MPI-M (Alemanha) | 1,875°×1,875° |
| 13 | MIROC6 | JAMSTEC (Japão) | 1,41°×1,41° |
| 14 | MRI-ESM2-0 | MRI/JMA (Japão) | 1,125°×1,125° |
| 15 | NorESM2-LM | NCC (Noruega) | 2,5°×1,875° |
| 16 | CESM2 | NCAR (EUA) | 1,25°×0,94° |
| 17 | CESM2-WACCM | NCAR (EUA) | 1,25°×0,94° |
| 18 | GFDL-ESM4 | GFDL/NOAA (EUA) | 1,25°×1,0° |

---

## 8. Variáveis Disponíveis

### 8.1. Saídas do WRF (NetCDF)

| Categoria | Variáveis | Descrição |
|---|---|---|
| Vento Horizontal | `U_ZL`, `V_ZL`, `S_ZL` | Componente zonal, meridional e velocidade nos níveis de altura |
| Temperatura e Umidade | `T_ZL`, `Q_ZL`, `RH_ZL`, `TD_ZL` | Temperatura, umidade específica, umidade relativa, ponto de orvalho |
| Pressão e Geopotencial | `P_ZL`, `GHT_ZL` | Pressão atmosférica e altura geopotencial |
| Coordenadas | `XLAT`, `XLONG` | Latitude e longitude dos pontos de grade |

### 8.2. Saídas do MPAS (NetCDF)

| Variável | Descrição |
|---|---|
| `u_50`, `u_100`, `u_150`, `u_200` | Vento zonal nas alturas de 50, 100, 150 e 200 m |
| `v_50`, `v_100`, `v_150`, `v_200` | Vento meridional nas alturas de 50, 100, 150 e 200 m |
| `wind_speed_50/100/150/200` | Velocidade do vento nas alturas especificadas |
| `pressure_sfc` | Pressão atmosférica à superfície |
| `latitude`, `longitude` | Coordenadas dos pontos de grade |

### 8.3. Produtos Processados (Frontend — COG + GeoParquet)

| Sigla | Variável | Unidade | Alturas | Estações |
|---|---|---|---|---|
| `ws10` | Velocidade do vento a 10 m | m/s | 10 m | ANNUAL, DJF, MAM, JJA, SON |
| `ws100` | Velocidade do vento a 100 m | m/s | 100 m | ANNUAL, DJF, MAM, JJA, SON |
| `wpd10` | Densidade de potência eólica a 10 m | W/m² | 10 m | ANNUAL, DJF, MAM, JJA, SON |
| `wpd100` | Densidade de potência eólica a 100 m | W/m² | 100 m | ANNUAL, DJF, MAM, JJA, SON |

Perfil vertical completo (GeoParquet): 10 m, 50 m, 100 m, 150 m, 200 m com médias, desvios padrão, mínimos, máximos e parâmetros de Weibull (k, c) por estação.

---

## 9. Batimetria e Área de Estudo

### Faixas Batimétricas

| Faixa | Descrição | Arquivo GeoJSON |
|---|---|---|
| 0–20 m | Plataforma interna | `batimetria_subfaixas_estadual_cured.geojson` |
| 20–50 m | Plataforma média | (mesmo arquivo, filtrado por atributo) |
| 50–75 m | Plataforma externa | (mesmo arquivo, filtrado por atributo) |
| 75–100 m | Plataforma profunda | (mesmo arquivo, filtrado por atributo) |
| 0–100 m | Plataforma continental total | `batimetria_0_100m_cured.geojson` |

### Origem dos Dados

- **Fonte:** ZEE Brasileiro — Programa de Levantamento da Plataforma Continental (LEPLAC)
- **Projeção:** EPSG:4326 (WGS84), codificação UTF-8
- **Recorte:** Zona Econômica Exclusiva (ZEE) — 200 milhas náuticas (~370 km) da costa
- **Estados costeiros cobertos (17):** AL, AP, BA, CE, ES, MA, PA, PB, PE, PI, PR, RJ, RN, RS, SC, SE, SP

---

## 10. Produtos de Dados e Estrutura de Diretórios

### Nuvem de dados no repositório

```
public/data/
├── bathymetry/                     # Shapefiles de batimetria (GeoJSON)
│   ├── batimetria_0_20_50_75_100m_cured.geojson
│   ├── batimetria_0_100m_cured.geojson
│   ├── batimetria_0_100m_estadual_cured.geojson
│   └── batimetria_subfaixas_estadual_cured.geojson
├── cogs/wrf/                       # Cloud Optimized GeoTIFFs
│   ├── ERA5_atlas/
│   ├── HIST/
│   ├── SSP2-4.5/
│   └── SSP5-8.5/
│       └── {var}{altura}/
│           └── {altura}m/
│               └── {estacao}/
│                   ├── ..._nacional_completo.tif
│                   ├── ..._nacional_0_100.tif
│                   └── ..._{uf}_{faixa}.tif
└── geoparquet/wrf/                 # GeoParquet de consultas analíticas
    ├── ERA5_atlas/
    ├── HIST/
    ├── SSP2-4.5/
    └── SSP5-8.5/
        └── all_seasons.parquet
```

### Volumes

| Tipo | Quantidade | Volume |
|---|---|---|
| NetCDF (raw, externo) | ~1,7 TB | Armazenamento bruto em `data/raw/` |
| COGs | ~5.688 arquivos | ~42 MB por experimento |
| GeoParquet | 24 arquivos (6 por experimento) | ~17–19 MB cada; ~228 MB total |

---

## 11. Observações e Estações de Validação

### Redes de Dados Observacionais

| Rede | Coordenação | Frequência | Altura do Anemômetro | Período |
|---|---|---|---|---|
| **PNBOIA** | Marinha do Brasil | 1 h | ~4,5 m (extrapolado para 10 m) | Até jun/2023 |
| **PIRATA** | NOAA / INPE / DHN | 10 min – 1 h | 4 m | 1997–presente |
| **SIMCOSTA** | FURG | 15 min – 1 h | 3–4 m | Variável |

### Desempenho das Reanálises (Taylor Skill Factor)

| Reanálise | TSF médio | RMSE norm. | Viés |
|---|---|---|---|
| **ERA5** | > 0,9 | ~0,6 | ~0 |
| **CCMP** | > 0,9 | < 0,6 | ~0 |
| **MERRA2** | Inferior | > 0,6 | Negativo |

---

## 12. Publicações Científicas

### Artigos completos publicados em anais

1. WEYLL, A. L. C. et al. **Mapeamento eólico offshore histórico e futuro usando Quantile Delta Mapping com ajuste de erros do downscaling CMIP6-WRF.** In: XI SAPCT e X ICPAD, 2026, Salvador.
2. RAMOS, D. N. S. et al. **MPAS-A OR WRF: WHICH IS THE BETTER WIND DOWNSCALING TOOL FOR WIND POTENTIAL MAPPING IN BRAZIL?** In: I SIEME, 2025, Maceió.
3. AYLAS, G. Y. R. et al. **ANALYZING HEAT WAVE IMPACTS ON ELECTRICITY DEMAND AND THERMAL STRESS: A STUDY WITH MPAS-A MODEL IN BAURU-SP.** In: I SIEME, 2025, Maceió.
4. PIRES, W. M. S. et al. **APPLICATION OF THE MPAS-A MODEL IN EXTREME WIND EVENTS IN SÃO PAULO STATE DURING OCTOBER 2024.** In: I SIEME, 2025, Maceió.
5. WEYLL, A. L. C. et al. **WIND SPEED BIAS CORRECTION FOR OFFSHORE WIND ENERGY: A CMIP6 AND MACHINE LEARNING-BASED APPROACH.** In: I SIEME, 2025, Maceió.
6. WEYLL, A. L. C. et al. **Correção de bias aplicada ao WRF com modelos clássicos de machine learning.** In: X SAPCT, 2025, Salvador.
7. PIRES, W. M. S. et al. **Análise e filtragem da quantidade de dados de entrada em modelos dinâmicos: representar o vento offshore atual e futuro.** In: X SAPCT, 2025, Salvador.
8. AYLAS, G. Y. R. et al. **Análise do potencial energético eólico offshore no Brasil para o ano de 2030 através de modelagem numérica.** In: X SAPCT, 2025, Salvador.
9. PIRES, W. M. S. et al. **Cenário atual e futuro do recurso eólico offshore no Brasil: ferramentas e aplicações.** In: IX SAPCT, 2024, Salvador.

---

## 13. Citação do Projeto

```
Cenário atual e futuro do recurso eólico offshore no Brasil: ferramentas e aplicações.
Projeto 407949/2022-4. Coordenação: Davidson Martins Moreira.
CS2I — SENAI CIMATEC, Salvador, BA, Brasil.
Dados disponíveis em: [repositório oficial].
DOI: [a registrar no zenodo].
```

---

> **Manutenção:** Este documento é a fonte oficial de metadados. Qualquer alteração nas configurações dos modelos, variáveis ou períodos deve ser refletida aqui antes de atualizar o FAQ em `src/lib/metadata.ts`.
