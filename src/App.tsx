import { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react'
import SidePanel from './components/SidePanel'
import MapView from './components/MapView'
import PixelInfoPanel from './components/PixelInfoPanel'
import DashboardSkeleton from './components/DashboardSkeleton'
import ErrorBoundary from './components/ErrorBoundary'
import TabBar, { type TabId } from './components/TabBar'
import FAQPanel from './components/FAQPanel'
import ProjectInfoPanel from './components/ProjectInfoPanel'
import LandingPage from './components/LandingPage'
import { queryDashboardLocation, loadParquet, type DashboardLocationData } from './lib/pixelQuery'
import { datasetFolder } from './lib/cogCatalog'
import type { Model, Dataset, Variable, Height, Season } from './lib/cogCatalog'
import type { PixelDataSummary } from './lib/pixelQuery'
import './App.css'

// Plotly (react-plotly.js + plotly.js) only lives inside this subtree — lazy-loading
// the whole DashboardView keeps its code (and Plotly's) out of the Map tab's bundle.
const DashboardView = lazy(() => import('./components/DashboardView'))

export default function App() {
  const [tab, setTab] = useState<TabId>('home')
  const [model, setModel] = useState<Model>('wrf')
  const [dataset, setDataset] = useState<Dataset>('ERA5_atlas_historico')
  const [variable, setVariable] = useState<Variable>('ws')
  const [height, setHeight] = useState<Height>(100)
  const [season, setSeason] = useState<Season>('annual')
  const [showBathymetry, setShowBathymetry] = useState(true)
  const [bathyLayer, setBathyLayer] = useState('bathy_0_100_nacional')
  const [pixelData, setPixelData] = useState<PixelDataSummary | null>(null)
  const [parquetLoaded, setParquetLoaded] = useState(false)
  const [parquetLoading, setParquetLoading] = useState(false)
  const [parquetCount, setParquetCount] = useState(0)
  const [basemap, setBasemap] = useState<string>('street')
  const [cogOpacity, setCogOpacity] = useState<number>(0.7)
  const [pinnedLocations, setPinnedLocations] = useState<DashboardLocationData[]>([])
  const [showFAQ, setShowFAQ] = useState(false)
  const [showProject, setShowProject] = useState(false)
  // Gates the first mount of DashboardView (and its Plotly-carrying subtree) to an
  // actual visit — once true it stays true, so switching back to Map (display:none)
  // keeps the Dashboard's local UI state (filters, fullscreen, inner tab) intact.
  const [dashboardVisited, setDashboardVisited] = useState(false)
  const pinnedRef = useRef(pinnedLocations)
  pinnedRef.current = pinnedLocations

  useEffect(() => {
    if (tab === 'dashboard') setDashboardVisited(true)
  }, [tab])

  useEffect(() => {
    if (tab === 'home') {
      document.documentElement.classList.add('landing-mode')
    } else {
      document.documentElement.classList.remove('landing-mode')
    }
    return () => document.documentElement.classList.remove('landing-mode')
  }, [tab])

  // Auto-load the pixel-query parquet for the selected pair as soon as the user
  // enters the Map or Dashboard, so "+ Add Location" works without a prior map
  // click. loadParquet is idempotent — it no-ops when the pair is already loaded.
  useEffect(() => {
    if (tab === 'map' || tab === 'dashboard') {
      loadParquet(datasetFolder(dataset), model)
    }
  }, [tab, dataset, model])

  // A1 — pinned locations carry a snapshot of whichever pair was loaded when the
  // point was added; when the user switches experiment/model, re-query each point
  // against the new pair so every chart reflects the current selection.
  useEffect(() => {
    const current = pinnedRef.current
    if (current.length === 0) return
    let cancelled = false
    ;(async () => {
      const refreshed: DashboardLocationData[] = []
      for (const loc of current) {
        const data = await queryDashboardLocation(loc.lat, loc.lon, model, datasetFolder(dataset))
        // Keep the previous snapshot when the new pair has no data (e.g. MPAS),
        // so switching model/experiment never wipes the pinned coordinates.
        refreshed.push(data ?? loc)
      }
      if (!cancelled) setPinnedLocations(refreshed)
    })()
    return () => { cancelled = true }
  }, [model, dataset])

  const handlePixelClick = useCallback((data: PixelDataSummary | null, loading: boolean, loaded: boolean, count: number) => {
    setPixelData(data)
    setParquetLoading(loading)
    setParquetLoaded(loaded)
    setParquetCount(count)
  }, [])

  const handleClosePanel = useCallback(() => {
    setPixelData(null)
  }, [])

  const handleAddLocation = useCallback(async (lat: number, lon: number) => {
    if (pinnedRef.current.length >= 3) return
    try {
      // Pass the current pair so queryDashboardLocation loads the parquet on demand
      // if it isn't loaded yet — the Dashboard no longer requires a prior map click.
      const data = await queryDashboardLocation(lat, lon, model, datasetFolder(dataset))
      if (!data) return
      setPinnedLocations(prev => prev.length >= 3 ? prev : [...prev, data])
    } catch (e) {
      console.error('Failed to query dashboard location:', e)
    }
  }, [model, dataset])

  const handleRemoveLocation = useCallback((idx: number) => {
    setPinnedLocations(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const handlePinFromPanel = useCallback((lat: number, lon: number) => {
    handleAddLocation(lat, lon)
  }, [handleAddLocation])

  const switchToDashboard = useCallback(() => setTab('dashboard'), [])

  return (
    <div className={`app${tab === 'home' ? ' app--landing' : ''}`}>
      {tab === 'home' ? (
        <LandingPage onNavigate={setTab} />
      ) : (
        <>
          <TabBar tab={tab} onChange={setTab} />
          <div className="tab-panel" style={{ display: tab === 'map' ? 'flex' : 'none' }}>
            <SidePanel
              model={model} setModel={setModel}
              dataset={dataset} setDataset={setDataset}
              variable={variable} setVariable={setVariable}
              height={height} setHeight={setHeight}
              season={season} setSeason={setSeason}
              showBathymetry={showBathymetry} setShowBathymetry={setShowBathymetry}
              bathyLayer={bathyLayer} setBathyLayer={setBathyLayer}
              onOpenDashboard={switchToDashboard}
              showFAQ={showFAQ} setShowFAQ={setShowFAQ}
              showProject={showProject} setShowProject={setShowProject}
              opacity={cogOpacity} setOpacity={setCogOpacity}
            />
            <div className="map-area">
              <MapView
                model={model} dataset={dataset} variable={variable} height={height}
                season={season}
                showBathymetry={showBathymetry} bathyLayer={bathyLayer}
                basemap={basemap} onBasemapChange={setBasemap}
                opacity={cogOpacity}
                onPixelClick={handlePixelClick}
                pinnedLocations={pinnedLocations}
                onAddPin={handleAddLocation}
                onRemovePin={handleRemoveLocation}
              />
              <ErrorBoundary>
                <PixelInfoPanel
                  data={pixelData}
                  loading={parquetLoading}
                  loaded={parquetLoaded}
                  recordCount={parquetCount}
                  pinnedCount={pinnedLocations.length}
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
                  model={model} setModel={setModel}
                  dataset={dataset} setDataset={setDataset}
                  pinnedLocations={pinnedLocations}
                  onAddLocation={handleAddLocation}
                  onRemoveLocation={handleRemoveLocation}
                />
              </Suspense>
            )}
          </div>
        </>
      )}
      {showFAQ && <FAQPanel onClose={() => setShowFAQ(false)} />}
      {showProject && <ProjectInfoPanel onClose={() => setShowProject(false)} />}
    </div>
  )
}
