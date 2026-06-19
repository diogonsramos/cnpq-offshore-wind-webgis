import { useState, useCallback, useRef } from 'react'
import SidePanel from './components/SidePanel'
import MapView from './components/MapView'
import PixelInfoPanel from './components/PixelInfoPanel'
import DashboardView from './components/DashboardView'
import ErrorBoundary from './components/ErrorBoundary'
import TabBar, { type TabId } from './components/TabBar'
import FAQPanel from './components/FAQPanel'
import ProjectInfoPanel from './components/ProjectInfoPanel'
import { queryDashboardLocation, isLoaded, type DashboardLocationData } from './lib/pixelQuery'
import type { Dataset, Variable, Height, Season, Region, BathyBand } from './lib/cogCatalog'
import type { PixelDataSummary } from './lib/pixelQuery'
import './App.css'

export default function App() {
  const [tab, setTab] = useState<TabId>('map')
  const [dataset, setDataset] = useState<Dataset>('ERA5_atlas')
  const [variable, setVariable] = useState<Variable>('ws')
  const [height, setHeight] = useState<Height>(100)
  const [season, setSeason] = useState<Season>('annual')
  const [region, setRegion] = useState<Region>('nacional')
  const [state, setState] = useState('BA')
  const [bathyBand, setBathyBand] = useState<BathyBand>('0_20')
  const [showBathymetry, setShowBathymetry] = useState(true)
  const [bathyLayer, setBathyLayer] = useState('batimetria_subfaixas_estadual')
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

  const handlePixelClick = useCallback((data: PixelDataSummary | null, loading: boolean, loaded: boolean, count: number) => {
    setPixelData(data)
    setParquetLoading(loading)
    setParquetLoaded(loaded)
    setParquetCount(count)
  }, [])

  const handleClosePanel = useCallback(() => {
    setPixelData(null)
  }, [])

  const handleAddLocation = useCallback((lat: number, lon: number) => {
    if (!isLoaded()) return
    const current = pinnedRef.current
    if (current.length >= 3) return
    const data = queryDashboardLocation(lat, lon)
    if (!data) return
    setPinnedLocations(prev => [...prev, data])
  }, [])

  const handleRemoveLocation = useCallback((idx: number) => {
    setPinnedLocations(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const handlePinFromPanel = useCallback((lat: number, lon: number) => {
    handleAddLocation(lat, lon)
  }, [handleAddLocation])

  const switchToDashboard = useCallback(() => setTab('dashboard'), [])

  return (
    <div className="app">
      <TabBar tab={tab} onChange={setTab} />
      <div className="tab-panel" style={{ display: tab === 'map' ? 'flex' : 'none' }}>
        <SidePanel
          dataset={dataset} setDataset={setDataset}
          variable={variable} setVariable={setVariable}
          height={height} setHeight={setHeight}
          season={season} setSeason={setSeason}
          region={region} setRegion={setRegion}
          state={state} setState={setState}
          bathyBand={bathyBand} setBathyBand={setBathyBand}
          showBathymetry={showBathymetry} setShowBathymetry={setShowBathymetry}
          bathyLayer={bathyLayer} setBathyLayer={setBathyLayer}
          onOpenDashboard={switchToDashboard}
          showFAQ={showFAQ} setShowFAQ={setShowFAQ}
          showProject={showProject} setShowProject={setShowProject}
        />
        <div className="map-area">
          <MapView
            dataset={dataset} variable={variable} height={height}
            season={season} region={region}
            state={state} bathyBand={bathyBand}
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
          dataset={dataset}
          pinnedLocations={pinnedLocations}
          onAddLocation={handleAddLocation}
          onRemoveLocation={handleRemoveLocation}
        />
      </div>
      {showFAQ && <FAQPanel onClose={() => setShowFAQ(false)} />}
      {showProject && <ProjectInfoPanel onClose={() => setShowProject(false)} />}
    </div>
  )
}
