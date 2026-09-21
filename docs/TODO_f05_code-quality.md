# f05 — code-quality

## Goal

Reduce technical debt: extract shared types, remove `any` castings, modularize CSS, refactor `App.tsx` state management with `useReducer`, and replace non-null assertions with safe access patterns.

## Files to modify

- `src/types.ts` _(new)_
- `src/components/TabBar.tsx`
- `src/components/DashboardView.tsx`
- `src/components/PixelInfoPanel.tsx`
- `src/lib/cogCatalog.ts`
- `src/components/SidePanel.tsx`
- `src/components/MapView.tsx`
- `src/App.tsx`
- `src/App.css` → split into:
  - `src/styles/dashboard.css`
  - `src/styles/sidepanel.css`
  - `src/styles/map.css`
  - `src/styles/pixel-panel.css`

## Acceptance criteria

### Shared types file

- [ ] Create `src/types.ts` with:
  - `TabId` (moved from TabBar.tsx)
  - `BasemapId` (currently stringly-typed in App.tsx)
  - `BathyLayerId` (currently string)
- [ ] Update all imports across the project
- [ ] Remove the old type declarations from TabBar.tsx

### Remove `any` castings

- [ ] `DashboardView.tsx`: replace `as const` + `as any` for Plotly data/layout types with proper `Plotly.Data` and `Plotly.Layout` from the `plotly.js-dist-min` package types
- [ ] `pixelQuery.ts`: replace `as any as RawWeibull` and `as any as Record<string, ...>` with typed accessor functions
- [ ] `cogTileRenderer.ts`: remove `as any` from `lerpColor` — the tuple type `[number, number, number, number]` is already correct, just ensure the stops parameters match

### Modularize CSS

- [ ] Split `App.css` into separate CSS files per component area
- [ ] Import each CSS file in the corresponding component (e.g., `import '../styles/dashboard.css'` in DashboardView)
- [ ] Keep only global resets and shared variables in `App.css`
- [ ] Verify no style regressions by running `pnpm test:e2e`

### useReducer refactor

- [ ] Replace the 17+ `useState` calls in `App.tsx` with a single `useReducer`
- [ ] Define `Action` union type:
  ```ts
  type Action =
    | { type: 'SET_TAB'; tab: TabId }
    | { type: 'SET_MODEL'; model: Model }
    | { type: 'SET_DATASET'; dataset: Dataset }
    | { type: 'SET_VARIABLE'; variable: Variable }
    | { type: 'SET_HEIGHT'; height: Height }
    | { type: 'SET_SEASON'; season: Season }
    | { type: 'SET_BASEMAP'; basemap: string }
    | { type: 'SET_BATHY_LAYER'; layer: string }
    | { type: 'SET_SHOW_BATHYMETRY'; show: boolean }
    | { type: 'SET_COG_OPACITY'; opacity: number }
    | { type: 'SET_PIXEL_DATA'; data: PixelDataSummary | null }
    | { type: 'SET_PARQUET_LOADING'; loading: boolean }
    | { type: 'SET_PARQUET_LOADED'; loaded: boolean; count: number }
    | { type: 'ADD_PIN'; loc: DashboardLocationData }
    | { type: 'REMOVE_PIN'; idx: number }
    | { type: 'REMOVE_ALL_PINS' }
    | { type: 'SET_SHOW_FAQ'; show: boolean }
    | { type: 'SET_SHOW_PROJECT'; show: boolean }
  ```
- [ ] Create the reducer function in a separate file `src/reducer.ts`
- [ ] Pass dispatch down instead of individual setters (props will change — update all component interfaces)

### Non-null assertion cleanup

- [ ] `PixelInfoPanel.tsx:86`: replace `data.weibull[10]!.k` with `data.weibull[10]?.k ?? null`
- [ ] `PixelInfoPanel.tsx:93`: replace `data.weibull[10]!.k` with `data.weibull[10]?.k` and `data.weibull[10]!.c` similarly
- [ ] `MapView.tsx:252`: replace `map.current!` with an early return guard
- [ ] Search the entire codebase for `!` non-null assertions and replace where a runtime guard is safer

## Test expectations

- [ ] `pnpm test` passes with 0 failures (all 41 existing E2E tests + type check)
- [ ] `pnpm test:types` passes with no errors
- [ ] No visual regressions in landing page, map, or dashboard

## Claude Code constraints

- No `any`, no `// @ts-ignore` — this branch is specifically to eliminate them
- CSS splitting: one CSS file per component, named after the component (e.g., `DashboardView.css` alongside `DashboardView.tsx`) — keep the existing pattern from `LandingPage.css`
- useReducer must preserve all existing behavior; no logic changes
- Run `pnpm test` before and after to confirm no regressions
