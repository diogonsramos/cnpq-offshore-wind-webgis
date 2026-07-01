import { useState, useCallback, useRef, useEffect } from 'react'
import SidePanel from './components/SidePanel'
import MapView from './components/MapView'
import PixelInfoPanel from './components/PixelInfoPanel'
import DashboardView from './components/DashboardView'
import ErrorBoundary from './components/ErrorBoundary'
import TabBar, { type TabId } from './components/TabBar'
import FAQPanel from './components/FAQPanel'
import ProjectInfoPanel from './components/ProjectInfoPanel'
import LandingPage from './components/LandingPage'
import { queryDashboardLocation, isLoaded, type DashboardLocationData } from './lib/pixelQuery'
import type { Model, Dataset, Variable, Height, Season } from './lib/cogCatalog'
import type { PixelDataSummary } from './lib/pixelQuery'
import './App.css'

export default function App() {
  const [tab, setTab] = useState<TabId>('home')
  const [model, setModel] = useState<Model>('wrf')
  const [dataset, setDataset] = useState<Dataset>('ERA5_atlas_historico')
  const [variable, setVariable] = useState<Variable>('ws')
  const [height, setHeight] = useState<Height>(100)
  const [season, setSeason] = useState<Season>('annual')
  const [showBathymetry, setShowBathymetry] = useState(true)
  const [bathyLayer, setBathyLayer] = useState('mn_zee_nacional')
  const [pixelData, setPixelData] = useState<PixelDataSummary | null>(null)
  const [parquetLoaded, setParquetLoaded] = useState(false)
  const [parquetLoading, setParquetLoading] = useState(false)
  const [parquetCount, setParquetCount] = useState(0)
  const [basemap, setBasemap] = useState<string>('street')
  const [pinnedLocations, setPinnedLocations] = useState<DashboardLocationData[]>([])
  const [showFAQ, setShowFAQ] = useState(false)
  const [showProject, setShowProject] = useState(false)
  const pinnedRef = useRef(pinnedLocations)
  pinnedRef.current = pinnedLocations

  useEffect(() => {
    if (tab === 'home') {
      document.documentElement.classList.add('landing-mode')
    } else {
      document.documentElement.classList.remove('landing-mode')
    }
    return () => document.documentElement.classList.remove('landing-mode')
  }, [tab])

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
    if (!isLoaded()) return
    const current = pinnedRef.current
    if (current.length >= 3) return
    try {
      const data = await queryDashboardLocation(lat, lon)
      if (!data) return
      setPinnedLocations(prev => [...prev, data])
    } catch (e) {
      console.error('Failed to query dashboard location:', e)
    }
  }, [])

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
            />
            <div className="map-area">
              <MapView
                model={model} dataset={dataset} variable={variable} height={height}
                season={season}
                showBathymetry={showBathymetry} bathyLayer={bathyLayer}
                basemap={basemap} onBasemapChange={setBasemap}
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
            <DashboardView
              model={model}
              dataset={dataset}
              pinnedLocations={pinnedLocations}
              onAddLocation={handleAddLocation}
              onRemoveLocation={handleRemoveLocation}
            />
          </div>
        </>
      )}
      {showFAQ && <FAQPanel onClose={() => setShowFAQ(false)} />}
      {showProject && <ProjectInfoPanel onClose={() => setShowProject(false)} />}
    </div>
  )
}
