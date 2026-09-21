# f02 — dashboard-charts (Revisado)

## Pré-requisito — Leitura obrigatória

Antes de implementar qualquer item, leia `docs/TODO.md`:

- **Fases 1 a 3.5** — já implementaram: eixos fixos nos gráficos Plotly (DashboardView, DashboardComparisonView, GeoParquetExplorer), `showlegend` condicional, padrão `chart-empty`, stub `t()` em `src/i18n/t.ts`, `hasRealDistanceData()` em `pixelQuery.ts`. **Não refazer**.
- **Limitações de dados (linhas 124–132)** — as colunas `wpd_*` e `*_heatmap` **não existem** em nenhum GeoParquet publicado (confirmado via pyarrow nas 5 estações × 4 experimentos). Itens que dependem dessas colunas foram **removidos** deste escopo.
- **Item C9 (linha 629)** — SSP2-4.5 e SSP5-8.5 Presente/Futuro colapsam para a mesma pasta em disco (pendente de pipeline). Não criar variações "Presente"/"Futuro" nos gráficos enquanto não houver dado distinto.

## Goal

Corrigir os gráficos Chart.js do PixelInfoPanel que ainda não foram atualizados pelo f01: ampliar Weibull, fixar ranges dos eixos, migrar textos para i18n, e remover non-null assertions inseguras.

## Files to modify

- `src/components/PixelInfoPanel.tsx`
- `src/components/WeibullChart.tsx`
- `src/components/ProfileChart.tsx`
- `src/i18n/pt-BR.ts`
- `tests/e2e/06-dashboard-controls.spec.ts`
- `docs/TODO.md`

## Acceptance criteria

- [ ] **Weibull chart enlarged** — height de `120px` para `200px`; chart permanece responsivo
- [ ] **Weibull eixos fixos** — X `[0, 30]` m/s, Y `[0, 0.3]` (validado: c máx=11.03 → PDF em x=30 é ~0; max PDF=0.21)
- [ ] **ProfileChart eixo X fixo** — `[0, 20]` m/s (validado: ws máx=10.25)
- [ ] **Non-null assertion removida** — `data.weibull[10]!.k` → `data.weibull[10]?.k` em PixelInfoPanel
- [ ] **i18n nos 3 componentes** — todos os textos usam `t('chave')` do stub já existente em `src/i18n/t.ts`
- [ ] **5 testes E2E novos** (T73–T77) em `06-dashboard-controls.spec.ts`

### Excluídos do escopo (dado inexistente)

| Item original | Motivo |
|---------------|--------|
| WPD profile no PixelInfoPanel | `wpd_profile_means` não existe em nenhum Parquet (0 colunas) |
| WPD profile no Dashboard | Já removido na Fase 3.4 pelo mesmo motivo |
| DirectionalHeatmap | Colunas `*_heatmap` não existem em nenhum Parquet |

Reavaliar quando o pipeline de dados publicar essas colunas (ver `docs/TODO.md` limitações).

## Behavior details

### Weibull chart

- Manter Chart.js (já usado), apenas aumentar height e fixar ranges.
- **Eixo X**: `min: 0, max: 30` (remover o `c * 3` dinâmico que viola eixo fixo).
- **Eixo Y**: `min: 0, max: 0.3, beginAtZero: true`.
- Tooltips e labels devem permanecer legíveis com o height maior.

### Profile chart

- **Eixo X**: `min: 0, max: 20`.
- Manter `indexAxis: 'y'` (perfil horizontal).

### Non-null assertion

- `PixelInfoPanel.tsx:74-75`: `data.weibull[10]!.k` → `data.weibull[10]?.k`, `data.weibull[10]!.c` → `data.weibull[10]?.c`.
- A condicional na linha 74 já protege com `?.` — o `!` é redundante e inseguro.

### Self-explanatory charts (mandatory)

Todo gráfico deve ser autoexplicativo:

- **Título principal** — descritivo, centralizado no topo
- **Label do eixo X** — texto claro (ex: "Velocidade do Vento (m/s)")
- **Label do eixo Y** — texto claro (ex: "Densidade de Probabilidade f(v)")
- **Ranges fixos** — NÃO auto-escalar. Usar bounds consistentes:
  - Weibull PDF: X `[0, 30]` m/s, Y `[0, 0.3]`
  - Perfil vento: X `[0, 20]` m/s, Y `[0, 210]` m com ticks em 10, 50, 100, 150, 200
- **Tooltips** — valores exatos no hover com unidades
- **Empty state** — se não há dado, mostrar `<div className="chart-empty">`

### i18n compliance

Usar a função `t()` já existente em `src/i18n/t.ts`:

```typescript
import { t } from '../i18n/t'
```

A assinatura é `t(key: string, vars?: Record<string, string | number>)` e usa `{{var}}` (chaves duplas).

Exemplo:
```typescript
t('pixel_info.button.pin', { count: String(pinnedCount) })
// → "Fixar Local (2/3)"
```

TODOS os textos — títulos, labels de eixo, tooltips, estados vazios, legendas — devem usar `t()`.

### Chaves a adicionar em `src/i18n/pt-BR.ts`

```typescript
'pixel_info.title': 'Informações do Pixel',
'pixel_info.status.click_map': 'Clique no mapa para consultar',
'pixel_info.status.loading': 'Carregando dados...',
'pixel_info.status.loaded': 'Clique no mapa para ver estatísticas ({{count}} pontos carregados)',
'pixel_info.status.no_data': 'Nenhum dado carregado',
'pixel_info.section.location': 'Localização',
'pixel_info.section.wind_100m': 'Velocidade do Vento — 100m',
'pixel_info.section.wind_10m': 'Velocidade do Vento — 10m',
'pixel_info.section.profile': 'Perfil Vertical',
'pixel_info.section.weibull': 'Parâmetros de Weibull',
'pixel_info.label.latitude': 'Latitude',
'pixel_info.label.longitude': 'Longitude',
'pixel_info.label.pixel_id': 'Pixel ID',
'pixel_info.label.state': 'Estado',
'pixel_info.label.bathymetry': 'Batimetria',
'pixel_info.label.dist_coast': 'Dist. Costa',
'pixel_info.label.mean': 'Média',
'pixel_info.label.min': 'Mín',
'pixel_info.label.max': 'Máx',
'pixel_info.label.std': 'Desv. Padrão',
'pixel_info.label.k': 'k',
'pixel_info.label.c': 'c (m/s)',
'pixel_info.button.pin': 'Fixar Local ({{count}}/3)',
'pixel_info.button.max_pins': 'Máx 3 Fixados',
'pixel_info.button.dashboard': 'Abrir Dashboard Completo',
'chart.weibull.title': 'Distribuição Weibull — {{height}}m',
'chart.weibull.x_axis': 'Velocidade do Vento (m/s)',
'chart.weibull.y_axis': 'Densidade de Probabilidade f(v)',
'chart.profile.title': 'Perfil Vertical do Vento',
'chart.profile.x_axis': 'Velocidade (m/s)',
'chart.profile.y_axis': 'Altura (m)',
```

## Data flow

```
PixelInfoPanel ← PixelDataSummary (já implementado)
  → WeibullChart (k, c, label)
  → ProfileChart (heights, means)

Sem mudanças no pixelQuery.ts — os dados já existem.
```

## Test expectations

- [ ] Adicionar nota em `docs/TODO.md`: f02 concluído, contagem de testes atualizada
- [ ] T73 — Weibull chart height ≥ 200px
- [ ] T74 — Eixo X Weibull fixo [0, 30] (último tick ≥ 25)
- [ ] T75 — ProfileChart eixo X fixo (range visível até ~20)
- [ ] T76 — PixelInfoPanel exibe labels em pt-BR via `t()`
- [ ] T77 — Non-null assertion removida: Weibull 10m não quebra

## Claude Code constraints

- No `any`, no `// @ts-ignore`
- Usar `t()` do stub existente — não recriar
- **Eixos fixos NÃO são opcionais** — auto-scaling é proibido
- NÃO implementar WPD profile nem heatmap (dado inexistente)
- Validar com `pnpm test` (alvo: 78 + 5 = **83 passed**)

## Checklist de entrega

- [ ] `WeibullChart.tsx`: height 120→200, eixos fixos [0,30]×[0,0.3], textos via `t()`
- [ ] `ProfileChart.tsx`: eixo X fixo [0,20], textos via `t()`
- [ ] `PixelInfoPanel.tsx`: non-null `!` removido, textos via `t()`
- [ ] `src/i18n/pt-BR.ts`: +30 chaves adicionadas
- [ ] `tests/e2e/06-dashboard-controls.spec.ts`: +5 testes (T73–T77)
- [ ] `docs/TODO.md`: marcar f02 concluído
- [ ] `pnpm test:types` — 0 erros
- [ ] `pnpm test` — 83 passed, 0 falhas
- [ ] Nenhum `console.error` ou `pageerror` novo
- [ ] Nenhum item de dado inexistente incluído
