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
import './SidePanel.css'

interface SidePanelProps {
  model: Model
  dataset: Dataset
  variable: Variable
  height: Height
  season: Season
  showBathymetry: boolean
  bathyLayer: BathyLayerId
  onOpenDashboard: () => void
  showFAQ: boolean
  showProject: boolean
  opacity: number
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
  showBathymetry, bathyLayer,
  onOpenDashboard,
  showFAQ, showProject,
  opacity,
  dispatch,
}: SidePanelProps) {
  const { t } = useLocale()
  return (
    <div className="side-panel">
      <div className="header">
        <h1>{t('sidepanel.header_title')}</h1>
        <p className="subtitle">{t('sidepanel.header_subtitle', { model: modelLabel(model, t).toUpperCase() })}</p>
      </div>

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
            options={DATASETS.map(d => ({ val: d, label: `${modelLabel(model, t)} ${datasetLabel(d, t)}` }))}
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
      </div>

      <div className="footer">
        <p className="footer-info">{modelLabel(model, t)} {datasetLabel(dataset, t)} | {varLabel(variable, t).label} {height}m</p>
        <div className="footer-icons">
          <button className="footer-icon-btn" onClick={() => dispatch({ type: 'SET_SHOW_FAQ', show: true })} title={t('sidepanel.faq_title')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/><text x="8" y="11.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">?</text></svg>
            <span>{t('sidepanel.faq_button')}</span>
          </button>
          <button className="footer-icon-btn" onClick={() => dispatch({ type: 'SET_SHOW_PROJECT', show: true })} title={t('sidepanel.project_title')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/><text x="8" y="11.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor">i</text></svg>
            <span>{t('sidepanel.project_button')}</span>
          </button>
          <button className="footer-icon-btn dashboard-btn" onClick={onOpenDashboard} title={t('sidepanel.dashboard_title')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="9" y="1" width="6" height="3" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="9" y="6" width="6" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
            <span>{t('sidepanel.dashboard_button')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
