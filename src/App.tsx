import { useReducer, useCallback, useRef, useEffect, lazy, Suspense } from 'react'
import SidePanel from './components/SidePanel'
import MapView from './components/MapView'
import PixelInfoPanel from './components/PixelInfoPanel'
import DashboardSkeleton from './components/DashboardSkeleton'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import FAQPanel from './components/FAQPanel'
import ProjectInfoPanel from './components/ProjectInfoPanel'
import LandingPage from './components/LandingPage'
import { queryDashboardLocation, loadParquet, type DashboardLocationData } from './lib/pixelQuery'

import type { PixelDataSummary } from './lib/pixelQuery'
import { appReducer, initialAppState } from './reducer'
import { LocaleProvider } from './i18n/provider'
import './App.css'

// Plotly (react-plotly.js + plotly.js) only lives inside this subtree — lazy-loading
// the whole DashboardView keeps its code (and Plotly's) out of the Map tab's bundle.
const DashboardView = lazy(() => import('./components/DashboardView'))

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialAppState)
  const {
    tab, model, dataset, variable, height, season,
    showBathymetry, bathyLayer, pixelData, parquetLoaded, parquetLoading, parquetCount,
    basemap, cogOpacity, pinnedLocations, showFAQ, showProject, dashboardVisited,
  } = state

  const pinnedRef = useRef(pinnedLocations)
  pinnedRef.current = pinnedLocations

  useEffect(() => {
    if (tab === 'home') {
      document.documentElement.classList.add('landing-mode')
    } else {
      document.documentElement.classList.remove('landing-mode')
    }
    
    // Sync tab and global state to hash without scrolling
    const params = new URLSearchParams()
    if (tab !== 'home') {
      params.set('model', model)
      params.set('dataset', dataset)
      params.set('var', variable)
      params.set('height', height.toString())
      params.set('season', season)
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    const targetHash = `/${tab}${query}`
    
    // Compare path and query (ignoring exact string match to avoid needless updates if order changes, but simple string compare is usually enough since we generate it deterministically)
    if (window.location.hash !== `#${targetHash}`) {
      window.history.replaceState(null, '', `#${targetHash}`)
    }

    return () => document.documentElement.classList.remove('landing-mode')
  }, [tab, model, dataset, variable, height, season])

  // Listen to browser navigation (back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hashStr = window.location.hash
      const path = hashStr.split('?')[0].replace(/^#\/?/, '')
      const query = hashStr.split('?')[1]
      const params = query ? new URLSearchParams(query) : new URLSearchParams()
      
      let newTab: any = 'home'
      if (path === 'map' || path === 'dashboard') {
        newTab = path
      }

      if (query) {
        dispatch({ type: 'SYNC_FROM_URL', tab: newTab, params })
      } else {
        dispatch({ type: 'SET_TAB', tab: newTab })
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Auto-load the pixel-query parquet for the selected pair as soon as the user
  // enters the Map or Dashboard, so "+ Add Location" works without a prior map
  // click. loadParquet is idempotent — it no-ops when the pair is already loaded.
  useEffect(() => {
    if (tab === 'map' || tab === 'dashboard') {
      loadParquet(dataset, model)
    }
  }, [tab, dataset, model])


  const handlePixelClick = useCallback((data: PixelDataSummary | null, loading: boolean, loaded: boolean, count: number) => {
    dispatch({ type: 'SET_PIXEL_DATA', data })
    dispatch({ type: 'SET_PARQUET_LOADING', loading })
    dispatch({ type: 'SET_PARQUET_LOADED', loaded, count })
  }, [])

  const handleClosePanel = useCallback(() => {
    dispatch({ type: 'SET_PIXEL_DATA', data: null })
  }, [])

  const handleAddLocation = useCallback(async (lat: number, lon: number) => {
    if (pinnedRef.current.length >= 3) return
    try {
      // Pass the current pair so queryDashboardLocation loads the parquet on demand
      // if it isn't loaded yet — the Dashboard no longer requires a prior map click.
      const data = await queryDashboardLocation(lat, lon, model, dataset)
      if (!data) return
      dispatch({ type: 'ADD_PIN', loc: data })
    } catch (e) {
      console.error('Failed to query dashboard location:', e)
    }
  }, [model, dataset])

  const handleRemoveLocation = useCallback((idx: number) => {
    dispatch({ type: 'REMOVE_PIN', idx })
  }, [])

  const handlePinFromPanel = useCallback((lat: number, lon: number) => {
    handleAddLocation(lat, lon)
  }, [handleAddLocation])

  const switchToDashboard = useCallback(() => dispatch({ type: 'SET_TAB', tab: 'dashboard' }), [])

  return (
    <LocaleProvider>
      <div className={`app${tab === 'home' ? ' app--landing' : ''}`}>
        <Header 
          tab={tab} 
          onNavigate={t => dispatch({ type: 'SET_TAB', tab: t })}
          onOpenFAQ={() => dispatch({ type: 'SET_SHOW_FAQ', show: true })}
        />
        {tab === 'home' ? (
          <LandingPage onNavigate={t => dispatch({ type: 'SET_TAB', tab: t })} />
        ) : (
          <>
            <div className="tab-panel" style={{ display: tab === 'map' ? 'flex' : 'none' }}>
              <SidePanel
                model={model} dataset={dataset} variable={variable} height={height} season={season}
                showBathymetry={showBathymetry} bathyLayer={bathyLayer}
                onOpenDashboard={switchToDashboard}
                showFAQ={showFAQ} showProject={showProject}
                opacity={cogOpacity}
                basemap={basemap}
                dispatch={dispatch}
              />
              <div className="map-area">
                <MapView
                  model={model} dataset={dataset} variable={variable} height={height}
                  season={season}
                  showBathymetry={showBathymetry} bathyLayer={bathyLayer}
                  basemap={basemap}
                  opacity={cogOpacity}
                  isPanelOpen={!!pixelData}
                  onPixelClick={handlePixelClick}
                  pinnedLocations={pinnedLocations}
                  onAddPin={handleAddLocation}
                  onRemovePin={handleRemoveLocation}
                  dispatch={dispatch}
                />
                <ErrorBoundary>
                  <PixelInfoPanel
                    data={pixelData}
                    loading={parquetLoading}
                    loaded={parquetLoaded}
                    recordCount={parquetCount}
                    pinnedCount={pinnedLocations.length}
                    height={height}
                    onClose={handleClosePanel}
                    onOpenDashboard={switchToDashboard}
                    onAddPin={handlePinFromPanel}
                  />
                </ErrorBoundary>
              </div>
            </div>
            <div className="tab-panel" style={{ display: tab === 'dashboard' ? 'flex' : 'none' }}>
              {dashboardVisited && (
                <Suspense fallback={<DashboardSkeleton />}>
                  <DashboardView
                    model={model} dataset={dataset}
                    pinnedLocations={pinnedLocations}
                    onAddLocation={handleAddLocation}
                    onRemoveLocation={handleRemoveLocation}
                    dispatch={dispatch}
                  />
                </Suspense>
              )}
            </div>
          </>
        )}
        {showFAQ && <FAQPanel onClose={() => dispatch({ type: 'SET_SHOW_FAQ', show: false })} />}
        {showProject && <ProjectInfoPanel onClose={() => dispatch({ type: 'SET_SHOW_PROJECT', show: false })} />}
      </div>
    </LocaleProvider>
  )
}
