# f04 — performance

## Goal

Reduce bundle size and runtime footprint: lazy-load Plotly only when the Dashboard tab is active, add cache eviction for IndexedDB parquet storage, and optimize map re-renders when switching tabs.

## Files to modify

- `src/components/DashboardView.tsx`
- `src/lib/pixelQuery.ts`
- `src/components/MapView.tsx`
- `vite.config.ts`
- `src/App.tsx`

## Acceptance criteria

### Lazy-load Plotly

- [ ] Dynamically import `react-plotly.js` only when the Dashboard tab mounts: `const Plot = lazy(() => import('react-plotly.js'))`
- [ ] Wrap DashboardView in `<Suspense fallback={<DashboardSkeleton />}>`
- [ ] The skeleton should mimic the chart grid layout (4 gray rectangles) to prevent layout shift
- [ ] Verify that the Map tab bundle does NOT include plotly code

### IndexedDB cache eviction

- [ ] Add a version check in `pixelQuery.ts`: if `CACHE_VERSION` has changed, clear all old stores via `indexedDB.deleteDatabase`
- [ ] Implement a storage quota check: before `cacheSet`, estimate total stored size. If > 50 MB, evict the oldest entries (LRU strategy using access timestamps)
- [ ] Add `lastAccessed` metadata alongside each cache entry
- [ ] Log cache stats only in development mode (`import.meta.env.DEV`)

### Map re-render optimization

- [ ] `MapView` already uses `memo`. Ensure that `onPixelClick` callback is stable (wrap in `useCallback` in App.tsx)
- [ ] Debounce COG redraw when switching back to Map tab: don't re-render COG if dataset/variable/height/season haven't changed since last view
- [ ] Add a ref to store the last rendered COG params and skip `drawCog` if they match

### Bundle analysis (optional but recommended)

- [ ] Run `npx vite-bundle-visualizer` and document the current bundle composition
- [ ] Ensure lazy-loading reduced the initial JS chunk by at least ~300 KB (Plotly baseline)

## Test expectations

- [ ] Add note in `docs/TODO.md`: f04 completed
- [ ] Manual check: Map tab loads without Plotly in the network tab
- [ ] Manual check: switching between Map and Dashboard 5+ times shows stable memory usage (< 10 MB growth)
- [ ] Manual check: old IndexedDB databases are cleared when version bumps

## Claude Code constraints

- No `any`, no `// @ts-ignore`
- `React.lazy` + `Suspense` require default exports or named exports — use `const LazyPlot = lazy(() => import('react-plotly.js'))` which works with named exports
- Cache eviction must not block the main thread — use async IDB transactions
- Preserve existing IndexedDB schema; only add the `lastAccessed` field
