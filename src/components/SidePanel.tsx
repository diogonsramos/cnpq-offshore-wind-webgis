import { useState, type Dispatch } from 'react'
import {
  MODELS, DATASETS, VARIABLES, HEIGHTS, SEASONS,
  datasetLabel, modelLabel, varLabel,
  type Model, type Dataset, type Variable, type Height, type Season,
} from '../lib/cogCatalog'
import type { BathyLayerId } from '../types'
import type { AppAction } from '../reducer'
import { useLocale } from '../i18n/provider'
import type { TranslationKey } from '../i18n/types'
import type { BasemapId } from '../types'
import BasemapSwitcher from './BasemapSwitcher'
import './SidePanel.css'

interface SidePanelProps {
  model: Model
  dataset: Dataset
  variable: Variable
  height: Height
  season: Season
  showBathymetry: boolean
  bathyLayer: BathyLayerId
  showIbama: boolean
  onOpenDashboard: () => void
  showFAQ: boolean
  showProject: boolean
  opacity: number
  basemap: BasemapId
  dispatch: Dispatch<AppAction>
}

function AccordionSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <div className="accordion-section">
      <button className="accordion-header" type="button" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className={`accordion-arrow ${open ? 'open' : ''}`}>&#9662;</span>
      </button>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  )
}

function RadioList<T extends string>({ label, options, value, onChange }: {
  label: string
  options: { val: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="radio-list-field">
      <p className="label">{label}</p>
      <div className="radio-list-options">
        {options.map(o => (
          <label key={o.val} className="radio-row">
            <input type="radio" name={label} checked={value === o.val} onChange={() => onChange(o.val)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

const BATHY_LAYERS: { val: BathyLayerId; labelKey: TranslationKey }[] = [
  { val: 'mn_zee_nacional', labelKey: 'sidepanel.bathy.mn_zee_nacional' },
  { val: 'mn_zee_estadual', labelKey: 'sidepanel.bathy.mn_zee_estadual' },
  { val: 'bathy_0_100_nacional', labelKey: 'sidepanel.bathy.bathy_0_100_nacional' },
  { val: 'bathy_0_100_estadual', labelKey: 'sidepanel.bathy.bathy_0_100_estadual' },
  { val: 'bathy_0_20_50_75_100_nacional', labelKey: 'sidepanel.bathy.bathy_0_20_50_75_100_nacional' },
  { val: 'bathy_0_20_50_75_100_estadual', labelKey: 'sidepanel.bathy.bathy_0_20_50_75_100_estadual' },
]

export default function SidePanel({
  model, dataset, variable, height, season,
  showBathymetry, bathyLayer, showIbama,
  onOpenDashboard,
  showFAQ, showProject,
  opacity, basemap,
  dispatch,
}: SidePanelProps) {
  const { t } = useLocale()
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={`side-panel ${isOpen ? '' : 'closed'}`}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px' }}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px',
            fontSize: '11px', cursor: 'pointer', color: '#475569', fontWeight: 600
          }}
        >
          {isOpen ? '← Ocultar' : 'Filtros →'}
        </button>
      </div>

      <div className="side-panel-content" style={{ display: isOpen ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
        <div className="filters">
        <AccordionSection title={t('sidepanel.section.model_experiment')}>
          <RadioList
            label={t('sidepanel.model_label')}
            options={MODELS.map(m => ({ val: m, label: modelLabel(m, t) }))}
            value={model}
            onChange={v => dispatch({ type: 'SET_MODEL', model: v as Model })}
          />
          <RadioList
            label={t('sidepanel.experiment_label')}
            options={DATASETS.map(d => ({ val: d, label: datasetLabel(d, t) }))}
            value={dataset}
            onChange={v => dispatch({ type: 'SET_DATASET', dataset: v as Dataset })}
          />
          <RadioList
            label={t('sidepanel.variable_label')}
            options={VARIABLES.map(v => ({ val: v, label: `${varLabel(v, t).label} (${varLabel(v, t).unit})` }))}
            value={variable}
            onChange={v => dispatch({ type: 'SET_VARIABLE', variable: v as Variable })}
          />
        </AccordionSection>

        <AccordionSection title={t('sidepanel.section.height')} defaultOpen={false}>
          <RadioList
            label={t('sidepanel.height_label')}
            options={HEIGHTS.map(h => ({ val: String(h), label: `${h}m` }))}
            value={String(height)}
            onChange={v => dispatch({ type: 'SET_HEIGHT', height: Number(v) as Height })}
          />
        </AccordionSection>

        <AccordionSection title={t('sidepanel.section.bathy')} defaultOpen={false}>
          <label className="checkbox-row">
            <input type="checkbox" checked={showBathymetry} onChange={e => dispatch({ type: 'SET_SHOW_BATHYMETRY', show: e.target.checked })} />
            <span>{t('sidepanel.bathy_checkbox_label')}</span>
          </label>
          {showBathymetry && (
            <div className="bathy-layers">
              {BATHY_LAYERS.map(bl => (
                <label key={bl.val} className="radio-row">
                  <input type="radio" name="bathyLayer" checked={bathyLayer === bl.val} onChange={() => dispatch({ type: 'SET_BATHY_LAYER', layer: bl.val })} />
                  <span>{t(bl.labelKey)}</span>
                </label>
              ))}
            </div>
          )}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <label className="checkbox-row">
              <input type="checkbox" checked={showIbama} onChange={e => dispatch({ type: 'SET_SHOW_IBAMA', show: e.target.checked })} />
              <span>{t('sidepanel.ibama_checkbox_label' as any)}</span>
            </label>
          </div>
        </AccordionSection>

        <AccordionSection title={t('sidepanel.cog.section_title')} defaultOpen={false}>
          <div className="range-field">
            <p className="label">{t('sidepanel.cog.opacity_label')} — {Math.round(opacity * 100)}%</p>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.1}
              value={opacity}
              onChange={e => dispatch({ type: 'SET_COG_OPACITY', opacity: Number(e.target.value) })}
            />
          </div>
        </AccordionSection>

        <div className="sidepanel-section" style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p className="label" style={{ margin: 0 }}>MAPA BASE</p>
          <BasemapSwitcher basemap={basemap} onChange={id => dispatch({ type: 'SET_BASEMAP', basemap: id })} />
          <button 
            onClick={() => window.dispatchEvent(new Event('take-map-screenshot'))}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px',
              background: '#f8fafc', color: '#475569', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s', width: '100%'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a' }}
            onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569' }}
          >
            📷 {t('mapview.screenshot_title') || 'Screenshot'}
          </button>
        </div>
      </div>

      <div className="footer">
        <p className="footer-info">{modelLabel(model, t)} {datasetLabel(dataset, t)} | {varLabel(variable, t).label} {height}m</p>

      </div>
      </div>
    </div>
  )
}
