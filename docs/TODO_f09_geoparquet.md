# 📝 Feature Specification: f09 — GeoParquet Restructuring & Performance Optimization

> **Status:** Em Especificação (Planejamento)  
> **Objetivo:** Reestruturar o pipeline de geração e acesso aos arquivos GeoParquet para acelerar o tempo de resposta do WebGIS/Dashboard de segundos para milissegundos (< 200ms), implementando indexação espacial, particionamento colunar e suporte a consultas eficientes.

---

## 1. Contexto e Diagnóstico de Desempenho (Baseline `main`)

Na arquitetura atual (`main`), o frontend baixa arquivos GeoParquet inteiros (~7,6 MB por arquivo anual / ~18 MB por par modelo-experimento) e descompacta via WebAssembly (`parquet-wasm`) em memória no navegador. 

Abaixo estão as tabelas de diagnóstico levantadas durante a auditoria de desempenho:

### Tabela 1.1: Inventário Atual dos Arquivos GeoParquet
| Parâmetro | Valor Atual |
|---|---|
| **Estrutura de Pastas** | `public/data/geoparquet/${model}/${experiment}/season=${season}.parquet` |
| **Total de Arquivos** | 40 arquivos `.parquet` (2 modelos × 4 experimentos × 5 estações) |
| **Tamanho Total em Disco** | **142,7 MB** |
| **Linhas por Arquivo (Pixels)** | **140.442 linhas** |
| **Colunas por Arquivo** | **67 colunas** (tabela "wide" desnormalizada) |
| **Tamanho do Arquivo Anual** | **~7,6 MB** (`annual.parquet`) |
| **Tamanho do Arquivo Sazonal** | **~2,6 MB** (`djf`, `mam`, `jja`, `son`) |
| **Volume por Modelo/Experimento** | **~18,0 MB** (Raw) / **~15,5 MB** (Gzip) |

---

### Tabela 1.2: Tempos de Acesso Medidos por Interação do Usuário
| Interação do Usuário | Mecanismo Interno | Volume Transferido | Tempo de Resposta (Download + Parse) | Avaliação de Usabilidade |
|---|---|---|---|---|
| **1. Carga Inicial do Mapa (`MapView`)** | Download `annual.parquet` + Parse `parquet-wasm` | ~7,6 MB | **700ms – 2,3s** | 🟡 Regular |
| **2. Consulta Pontual (Clique no Pixel)** | Busca linear $O(N)$ em memória (140k objetos JS) | 0 B (memória) / +10,4 MB (se requerer estações) | **15ms – 40ms** (busca) / **+1,2s – 3,5s** (sazonal) | 🟡 Aceitável na busca / 🔴 Lenta no sazonal |
| **3. Troca de Variável / Altura (Dashboard)** | Recálculo de estado React em memória | 0 B | **< 50ms** | 🟢 Excelente |
| **4. Troca de Modelo / Experimento** | Invalidação de slot único + Re-fetch + WASM parse | ~7,6 MB | **800ms – 2,5s** | 🟡 Regular |
| **5. Comparar Experimentos (3 Pares)** | **Loop Sequencial de Invalidação** (P1 $\rightarrow$ P2 $\rightarrow$ P3 $\rightarrow$ Restaura P1) | **até 61,6 MB** | **5,0s – 14,0s** | 🔴 **Crítico** (Excessivo re-fetch) |
| **6. Comparar Modelos (WRF vs MPAS)** | Sequencial: Carrega WRF $\rightarrow$ MPAS $\rightarrow$ Restaura Mapa | **34,4 MB – 43,6 MB** | **3,5s – 9,0s** | 🔴 **Lento** |
| **7. GeoParquet Explorer (Filtros)** | Varredura em memória de 140k registros + 5 Plotly | 0 B (memória) / 15,2 MB (se trocar dataset) | **150ms – 350ms** (memória) / **1,5s – 5,0s** (re-fetch) | 🟡 Bom em memória / 🔴 Ruim no re-fetch |

---

## 2. Gargalos Estruturais Identificados

1. **Slot Único de Memória no Frontend (`pixelQuery.ts`):** O cache mantém apenas um dataset por vez. Comparar 3 experimentos força o download e parse em loop de até 61,6 MB por interação.
2. **Esquema "Wide" com 67 Colunas:** Cada requisição baixa e descompacta todas as 67 colunas na main thread JS, alocando 40–70 MB de RAM.
3. **Ausência de Indexação Espacial:** O arquivo Parquet não possui ordenação espacial (curva de Hilbert / Morton / H3), forçando a leitura de 100% dos dados para consultar uma região específica.
4. **Ausência de HTTP Byte-Range Requests:** O frontend faz `fetch(url)` integral em vez de utilizar requisições seletivas por bloco de bytes (headers/footers Parquet).

---

## 3. Requisitos para a Nova Estrutura GeoParquet (`f09`)

O gerador de GeoParquet no HPC deverá produzir arquivos otimizados com os seguintes requisitos:

### 3.1. Requisitos de Colunas e Variáveis (Frontend Contract)
Ao clicar em qualquer pixel do mapa, o painel do WebGIS necessita exibir:
- **Metadados do Pixel:** `pixel_id` (int32), `lat` (float32), `lon` (float32), `state` (string), `bathy_zone` (string). *(Nota: a propriedade `distance_nm` foi desativada no frontend e postergada para uma feature futura, não sendo necessário o seu cálculo nesta fase)*.
- **Estatísticas por Altura (10m, 50m, 100m, 150m, 200m):**
  - Média (`mean`), Mínimo (`min`), Máximo (`max`), Mediana (`p50`), Desvio Padrão (`std`).
  - Percentis: `p5`, `p50`, `p95`, `p99` para velocidade do vento (`ws`) e densidade de potência (`wpd`).
- **Parâmetros de Weibull:** Escala ($c$) e Forma ($k$) para cada altura ($10\text{m}, 50\text{m}, 100\text{m}, 150\text{m}, 200\text{m}$).
- **Rosa dos Ventos (12 Setores):** Frequência de ocorrência (%) e velocidade média por setor para as 12 direções cardeais ($0^\circ, 30^\circ, 60^\circ, \dots, 330^\circ$).
- **Perfis Verticais:** Listas/arrays com médias de velocidade do vento e densidade de potência nas 5 alturas.

### 3.2. Estratégia de Indexação Espacial & Row Grouping
- **Ordenação por Curva de Hilbert / GeoHash:** As linhas do DataFrame devem ser ordenadas por proximidade espacial (curva de Hilbert ou Hilbert Spatial Index em `lat, lon`) antes da escrita em Parquet.
- **Tamanho dos Row Groups:** Fixar `row_group_size` entre **5.000 e 10.000 linhas**.
- **Metadados de Bounding Box:** Habilitar estatísticas de coluna (`write_statistics=True`) para que leitores inteligentes leiam apenas os Row Groups cujos limites geográficos coincidam com o Bounding Box da consulta.

### 3.3. Divisão de Esquema em Camadas (Core vs Detailed)
- **`summary_annual.parquet` (~1,0 MB):** Apenas `pixel_id`, `lat`, `lon`, `state`, `bathy_zone`, `distance_nm`, `ws100_ANNUAL_mean`, `wpd100_ANNUAL_mean`.
- **`details_annual.parquet` (~5,0 MB):** Todos os percentis, Weibull $c, k$, Rosa dos ventos (12 setores) e vetores de perfil vertical.

---

## 4. Metas de Desempenho Alvo

| Operação | Baseline (`main`) | Meta Projetada (`f09`) | Redução Esperada |
|---|---|---|---|
| Carga Inicial do Mapa | 1,5s – 2,3s | **150ms – 350ms** | ⬇️ **~85%** |
| Troca de Experimento/Modelo | 1,2s – 2,5s | **< 200ms** | ⬇️ **~85%** |
| Comparar 3 Experimentos | 5,0s – 14,0s | **300ms – 800ms** | ⬇️ **~95%** |
| Consulta de Ponto (Clique) | 15ms – 3,5s | **< 20ms** | ⬇️ **~95%** |
| Transferência Total por Sessão | ~80 MB – 150 MB | **< 8 MB** | ⬇️ **~90%** |

---
*Documento de especificação técnica gerado para a feature f09 (cnpq-offshore-wind-webgis).*
