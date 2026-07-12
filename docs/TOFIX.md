# 🔧 TOFIX.md — Plano de Correção (branch `f01/dashboard-controls`)

Este documento planeja a correção de 3 problemas reportados após os commits `e65ef6c`, `de1c1d4` e `c4003bc`. Cada um foi investigado até a causa raiz antes de propor a correção — ver seção "Causa raiz" de cada item. Decisões de escopo já validadas com o usuário estão marcadas como **Decisão**.

---

## Visão geral

| # | Problema | Tipo | Escopo desta rodada |
|---|---|---|---|
| 1 | Explorador GeoParquet — gráfico "Distância vs. Média" com todos os pontos em X=0 | Limitação de dado (não é bug de lógica) | Mitigação de UI (comunicar limitação) |
| 2 | Dashboard — "ERA5 Reanálise (Presente)" e "(Histórico)" mostram dado idêntico | Bug de modelagem do catálogo de datasets | Remover opção duplicada |
| 3 | Dashboard — aba "Visão Simples" não indica qual cor é qual localização | Regressão de CSS (classe morta reutilizada por engano) | Corrigir legenda |
| — | *Achado colateral*: `SSP2-4.5`/`SSP5-8.5` "Presente" vs "Futuro" também colapsam para o mesmo arquivo | Limitação de dado (pipeline) | Só documentar, não implementar agora |

---

## Item 1 — "Distância vs. Média" com todos os pontos em X=0

### Causa raiz confirmada

A coluna `distance_nm` **não existe** nos arquivos GeoParquet publicados. Verificado via schema real (`pyarrow`) de `public/data/geoparquet/wrf/*/all_seasons.parquet`:

```
pixel_id, lat, lon, state, bathy_zone, geometry, ws10_*, ws100_*,
profile_heights, profile_means, weibull_10m, weibull_100m, wind_rose_100m, season
```

Não há `distance_nm` em nenhum dos 4 experimentos (`era5_atlas`, `hist`, `ssp2-4.5`, `ssp5-8.5`).

Em `src/lib/pixelQuery.ts:239`:
```ts
distance_nm: Number(row.distance_nm ?? 0),
```
Como `row.distance_nm` é sempre `undefined`, **todo pixel recebe `distance_nm = 0`**. O filtro (`pixelQuery.ts:580`, `r.distance_nm < distMin || r.distance_nm > distMax`) vira um no-op (todo pixel passa, não importa a zona marcada), e o scatter (`GeoParquetExplorer.tsx:319-324`, eixo X = `result.distances`) empilha tudo em zero. A regressão linear também degenera (`den === 0` em `linearRegression()`, `GeoParquetExplorer.tsx:41`).

**Não há bug no código do gráfico ou do filtro** — `distanceMaxFromZones()` (`GeoParquetExplorer.tsx:54-57`) e a leitura de `result.distances` (`pixelQuery.ts:620`) já fazem a coisa certa; só não há dado real para consumir. Essa limitação já estava documentada em `docs/TODO.md:125`, mas o commit `c4003bc` reformulou os controles do filtro (checkboxes de zona) sem alterar esse fato — por isso o problema "continua".

Gerar `distance_nm` de verdade exigiria uma geometria de linha de costa/fronteira marítima (não existe nenhum shapefile de costa no repo — só polígonos de estado e batimetria em `public/data/bathymetry/`) e um cálculo de distância mínima por pixel, feito no pipeline de geração do GeoParquet (fora deste repositório de front-end).

### Decisão

> **Comunicar a limitação na UI agora**, em vez de manter um gráfico enganoso ativo. Correção só de front-end, sem depender do pipeline de dados.

### Passos

1. **`src/lib/pixelQuery.ts`** — expor no retorno de `queryFilteredPixels` (ou como helper exportado, ex. `hasRealDistanceData(result: FilteredAggregates): boolean`) uma checagem simples: `result.distances.some(d => d > 0)`. Isso torna a mitigação autoreversível — no dia em que o pipeline publicar `distance_nm` real, a UI volta a mostrar o gráfico sem nenhuma mudança de código adicional.
2. **`src/components/GeoParquetExplorer.tsx`**:
   - Desabilitar (não remover) os checkboxes de `DISTANCE_ZONE_OPTIONS` (linhas 193-201), com um selo/tooltip indicando que o dado ainda não está disponível (reaproveitar o padrão visual já usado em `chip.disabled` se existir, ou `opacity: 0.5` + `cursor: not-allowed` + `title="Dado de distância da costa ainda não publicado"`).
   - Trocar o card do scatter (linhas 319-355) para o mesmo padrão já usado nos boxplots condicionais (`chart-card chart-empty`, ver linhas 288/316) quando `!hasRealDistanceData(result)`: exibir uma mensagem central em vez do gráfico degenerado.
   - Novas chaves de i18n em `src/i18n/pt-BR.ts`: `geoparquet_explorer.filters.distance_disabled_hint` (tooltip do filtro) e `geoparquet_explorer.charts.scatter_hidden` (mensagem do placeholder), seguindo o padrão de `boxplot_state_hidden`/`boxplot_bathy_hidden` já existentes.
3. **`docs/TODO.md`** — atualizar a nota da linha 125 e o item **C7** (linha 592) confirmando que a UI agora comunica a limitação explicitamente (não mais um filtro/gráfico silenciosamente inerte), e detalhar os passos reais de pipeline pendentes: (a) obter/gerar uma geometria de linha de costa ou limite de ZEE; (b) calcular distância mínima por pixel; (c) escrever `distance_nm` nos `.parquet` publicados — nenhuma mudança de código de consumo será necessária além de remover a mitigação de UI.
4. **Testes novos** em `tests/e2e/08-geoparquet-explorer.spec.ts`:
   - **T69** — checkboxes de "Distância da Costa" aparecem desabilitados com o tooltip/mensagem de dado indisponível.
   - **T70** — ao aplicar filtros, o card do scatter "Distância vs. Média" mostra a mensagem de placeholder em vez de um gráfico com pontos em X=0.

---

## Item 2 — ERA5 "Presente" e "Histórico" idênticos

### Causa raiz confirmada

`src/lib/cogCatalog.ts:104-106`:
```ts
export function datasetFolder(d: Dataset): string {
  return d.replace(/_(historico|presente|futuro)$/, '')
}
```
`datasetFolder('ERA5_atlas_historico')` e `datasetFolder('ERA5_atlas_presente')` resolvem para a **mesma** pasta `'ERA5_atlas'`. Confirmado em disco: só existe `public/data/geoparquet/wrf/era5_atlas/` e `public/data/cogs/wrf/ERA5_atlas/` — nenhuma pasta separada para uma variante "presente".

Isso não é um bug de comparação de string (não há `.toLowerCase()`/normalização quebrada) — é a função `datasetFolder` fazendo exatamente o que foi projetada para fazer (descartar o sufixo temporal, que hoje não tem contrapartida em disco para nenhum experimento), aplicada a um par (`ERA5_atlas_historico`/`ERA5_atlas_presente`) que **nunca deveria ter existido como dois datasets distintos**: reanálise ERA5 é, por definição, um produto histórico (reconstrução baseada em observações passadas) — não existe uma variante "presente" real dela, diferente dos cenários climáticos `SSP2-4.5`/`SSP5-8.5`, que legitimamente têm períodos "Presente" e "Futuro" simulados distintos.

### Achado colateral (mesmo bug, escopo mais amplo)

A mesma função `datasetFolder()` também colapsa `SSP2-4.5_presente`/`SSP2-4.5_futuro` para a única pasta `SSP2-4.5/` em disco (idem para `SSP5-8.5`) — confirmado via `find` (só existe uma pasta por cenário) e via schema do parquet (`public/data/geoparquet/wrf/ssp2-4.5/all_seasons.parquet` não tem nenhuma coluna que distinga período presente/futuro). **Diferente do caso ERA5, aqui a duplicidade é indevida** — presente e futuro de um mesmo cenário climático deveriam ter dado real distinto. O usuário reportou "os demais estão ok", então é provável que a comparação tenha sido feita apenas entre experimentos diferentes (que de fato têm pastas diferentes: `era5_atlas` vs `hist` vs `ssp2-4.5` vs `ssp5-8.5`), sem checar presente vs. futuro dentro do mesmo cenário.

**Não incluído no escopo desta correção** (é tarefa de pipeline de dados, não de front-end), mas registrado aqui para não ser esquecido — ver checklist final.

### Decisão

> **Remover a opção "ERA5 Reanálise (Presente)"** do seletor de Experimento. Mantém só "ERA5 Reanálise (Histórico)", que reflete a realidade científica do dado (rean. ERA5 é só histórica) e elimina a duplicidade sem depender de nenhum dado novo.

### Passos

1. **`src/lib/cogCatalog.ts`**:
   - `Dataset` (linha 2): remover `'ERA5_atlas_presente'` do union type.
   - `DATASETS` (linhas 9-14): remover `'ERA5_atlas_presente'` do array.
   - `DATASET_LABEL` (linhas 64-72): remover a entrada `ERA5_atlas_presente: 'ERA5 Reanálise (Presente)'`.
2. Nenhum outro arquivo referencia `ERA5_atlas_presente` diretamente (confirmado via grep no repo) — o valor só é consumido através de `DATASETS`/`datasetLabel()`, então remover na fonte já propaga para o seletor do Dashboard, do GeoParquet Explorer e das abas de comparação.
3. Verificar (rodando `pnpm test`) se algum teste E2E existente faz `selectOption` ou asserção contando as opções do `<select>` de Experimento — atualizar a contagem esperada onde necessário (ex. `06-dashboard-controls.spec.ts`, `07-dashboard-comparison.spec.ts`, `08-geoparquet-explorer.spec.ts`).
4. **Teste novo**: **T71** — o seletor de Experimento não oferece mais "ERA5 Reanálise (Presente)"; só "ERA5 Reanálise (Histórico)" aparece, e selecioná-la carrega o mesmo dado de antes (regressão simples, sem quebrar o fluxo existente).
5. **`docs/TODO.md`** — documentar a remoção e registrar o achado colateral (SSP presente/futuro colapsados) como limitação de dado pendente, com a mesma recomendação de mitigação do Item 1 (badge/aviso na UI) até o pipeline publicar períodos distintos — decisão de priorização fica para uma rodada futura.

---

## Item 3 — Aba "Visão Simples" não identifica cor↔localização

### Causa raiz confirmada

`src/components/DashboardView.tsx:184-189` renderiza um chip por localização fixada:
```tsx
<span key={i} className="chip-state" style={{ borderColor: COLORS[i] }}>
  {modelLabelStr} ({loc.lat.toFixed(2)}, {loc.lon.toFixed(2)})
  <button className="chip-remove" onClick={() => onRemoveLocation(i)}>&times;</button>
</span>
```
Mas a classe `.chip-state` em `src/App.css:941-946` está sob um comentário explícito **`/* ── Dashboard Modal (dead, kept for reference) ── */`**:
```css
.chip-state {
  font-weight: 600;
  color: #4a90d9;   /* cor fixa — ignora o COLORS[i] do inline style */
  font-size: 10px;
}
```
Essa classe não define nenhum `border` (só existe `border-color` via inline style, sem `border-style`/`border-width` — logo nada aparece visualmente) e tem `color` de texto fixo, **ignorando completamente** a cor por localização. Ou seja: o componente já tenta diferenciar por cor (passa `COLORS[i]` corretamente), mas reaproveitou por engano um resíduo de CSS morto de um componente antigo, em vez da classe de legenda funcional que já existe no projeto.

Comparação com as abas de comparação — `DashboardComparisonView.tsx:215-224` usa:
```tsx
<span key={e.key} className="dv-legend-chip" style={{ borderLeftColor: e.style.color }}>
  <span className={`dv-legend-swatch ...`} style={{ background: e.style.color }} />
  {e.label}
  ...
</span>
```
com CSS real e funcional em `App.css:390-411` (`.dv-legend-chip`, `.dv-legend-swatch`, `.dv-legend-swatch--dash`, `.dv-legend-state`).

Além disso, dos 4 gráficos da Visão Simples, só o de Weibull manteve `showlegend: true` (`DashboardView.tsx:286-287`) após o commit `c4003bc` — os outros 3 (Sazonal `:235`, Rosa dos Ventos `:320`, Perfil Vertical `:362`) têm `showlegend: false`, mesma configuração das abas de comparação. A diferença é que as abas de comparação **compensam** essa ausência com a legenda funcional `dv-legend-chip`; a Visão Simples só tem o chip decorativo morto — por isso, fora do gráfico de Weibull, não há nenhuma forma de saber qual cor é qual local.

### Correção

Substituir o markup do chip em `DashboardView.tsx:184-189` para usar `dv-legend-chip`/`dv-legend-swatch` (mesmo padrão de `DashboardComparisonView.tsx`), com o texto do chip usando `locLabel(loc, i)` (`"Loc N"`) para bater exatamente com os nomes usados nos traços do gráfico Weibull (`DashboardView.tsx:69-70`, `:260`) — hoje o chip mostra `"WRF (-8.97, -34.00)"` e o gráfico mostra `"Loc 1 (k=..., c=...)"`, dois vocabulários diferentes para a mesma coisa.

### Passos

1. **`src/components/DashboardView.tsx`** (linhas 184-189): trocar `className="chip-state"` pelo padrão de legenda:
   ```tsx
   <span key={i} className="dv-legend-chip" style={{ borderLeftColor: COLORS[i] }}>
     <span className="dv-legend-swatch" style={{ background: COLORS[i] }} />
     {locLabel(loc, i)} — {modelLabelStr} ({loc.lat.toFixed(2)}, {loc.lon.toFixed(2)})
     <button className="chip-remove" onClick={() => onRemoveLocation(i)}>&times;</button>
   </span>
   ```
2. **`src/App.css`**: remover a classe morta `.chip-state` (linhas 941-946) e seu comentário `dead, kept for reference` — não é mais referenciada em lugar nenhum após o passo 1. Manter `.chip-remove` (ainda usado). Verificar se `.dv-chip` (linhas 266-277) é usado em algum outro lugar do código; se também estiver órfã, avaliar remoção na mesma limpeza (não misturar com este fix se não tiver certeza — checar via grep antes).
3. Confirmar visualmente que a cor do swatch de cada chip bate com a cor de cada série nos 4 gráficos (Sazonal, Weibull, Rosa dos Ventos, Perfil) — todos já usam o mesmo array `COLORS[i]` por índice de localização, então deve alinhar automaticamente.
4. **Teste novo** em `tests/e2e/06-dashboard-controls.spec.ts` (ou novo arquivo, se preferir agrupar por aba): **T72** — ao fixar 2+ localizações na Visão Simples, cada uma ganha um chip com swatch colorido visível e rótulo `"Loc N"`, com cores que não se repetem entre si e que correspondem à ordem de fixação.

---

## Validação manual e visual (nova exigência para esta rodada)

Além dos testes E2E automatizados, o usuário pediu que esta correção específica passe por uma checagem manual/visual antes de ser considerada concluída. Plano:

1. Rodar `pnpm dev` e abrir o app localmente.
2. **Item 1**: no Explorador GeoParquet, marcar uma ou mais zonas de distância, aplicar filtros, e confirmar visualmente que (a) os checkboxes aparecem desabilitados/com aviso, e (b) o card do scatter mostra a mensagem de placeholder — não mais pontos empilhados em X=0.
3. **Item 2**: abrir o seletor de Experimento no Dashboard (qualquer aba) e confirmar visualmente que só existe "ERA5 Reanálise (Histórico)" na lista — sem a entrada "(Presente)".
4. **Item 3**: na aba "Visão Simples", fixar 2-3 localizações e confirmar visualmente que aparecem chips com swatch colorido e rótulo "Loc N", e que as cores batem com as usadas nos 4 gráficos (especialmente comparando lado a lado com a legenda nativa do gráfico de Weibull, que já funciona).
5. Capturar screenshot de cada um dos 3 cenários acima (antes/depois) para registro na entrega.
6. Rodar `pnpm test` (typecheck + suite E2E completa) e confirmar `0 falhas` antes de considerar a tarefa concluída.

---

## Checklist de entrega desta rodada

- [x] Item 1 implementado (mitigação de UI para "Distância da Costa")
- [x] Item 2 implementado (remoção de "ERA5 (Presente)")
- [x] Item 3 implementado (legenda funcional na Visão Simples)
- [x] Validação manual/visual dos 3 itens realizada (ver seção acima) — screenshots via Playwright contra o dev server, sem erro de console
- [x] Novos testes T69–T72 adicionados e passando
- [x] `pnpm test` — 78 passed, 0 falhas
- [x] `docs/TODO.md` atualizado: itens `[x]` (nova entrada "Fase 3.5"), tabela de testes, arquivos modificados, e nota sobre o achado colateral de `SSP2-4.5`/`SSP5-8.5` presente/futuro registrada como **C9** (pendente, fora de escopo)
- [x] Nenhum `console.error`/warning novo durante os testes
