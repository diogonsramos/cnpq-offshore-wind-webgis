import { useState } from 'react'
import {
  MODELS, DATASETS, VARIABLES, HEIGHTS, SEASONS,
  datasetLabel, modelLabel, varLabel,
  type Model, type Dataset, type Variable, type Height, type Season,
} from '../lib/cogCatalog'
import { t } from '../i18n/t'

interface SidePanelProps {
  model: Model; setModel: (v: Model) => void
  dataset: Dataset; setDataset: (v: Dataset) => void
  variable: Variable; setVariable: (v: Variable) => void
  height: Height; setHeight: (v: Height) => void
  season: Season; setSeason: (v: Season) => void
  showBathymetry: boolean; setShowBathymetry: (v: boolean) => void
  bathyLayer: string; setBathyLayer: (v: string) => void
  onOpenDashboard: () => void
  showFAQ: boolean; setShowFAQ: (v: boolean) => void
  showProject: boolean; setShowProject: (v: boolean) => void
  opacity: number; setOpacity: (v: number) => void
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

function SelectField<T extends string>({ label, options, value, onChange }: {
  label: string
  options: { val: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="select-field">
      <p className="label">{label}</p>
      <select value={value} onChange={e => onChange(e.target.value as T)}>
        {options.map(o => (
          <option key={o.val} value={o.val}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function SearchableSelect({ label, options, value, onChange }: {
  label: string
  options: { val: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.val === value)

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()) || o.val.toLowerCase().includes(query.toLowerCase()))
    : options

  return (
    <div className="select-field">
      <p className="label">{label}</p>
      <div className="combobox" onBlur={() => setTimeout(() => setOpen(false), 180)}>
        <input
          className="combobox-input"
          type="text"
          placeholder={selected ? `${selected.label} (${selected.val})` : 'Type to search...'}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {open && filtered.length > 0 && (
          <div className="combobox-dropdown">
            {filtered.map(o => (
              <div
                key={o.val}
                className={`combobox-option ${o.val === value ? 'active' : ''}`}
                onMouseDown={() => { onChange(o.val); setQuery(''); setOpen(false) }}
                title={o.label}
              >
                <span className="combobox-option-label">{o.label}</span>
                <span className="combobox-option-val">{o.val}</span>
              </div>
            ))}
          </div>
        )}
        {open && filtered.length === 0 && (
          <div className="combobox-dropdown">
            <div className="combobox-empty">No results</div>
          </div>
        )}
      </div>
    </div>
  )
}

const BATHY_LAYERS = [
  { val: 'mn_zee_nacional', label: 'ZEE Nacional' },
  { val: 'mn_zee_estadual', label: 'ZEE Estadual' },
  { val: 'bathy_0_100_nacional', label: 'Plataforma Nacional (0-100m)' },
  { val: 'bathy_0_100_estadual', label: 'Plataforma Estadual (0-100m)' },
  { val: 'bathy_0_20_50_75_100_nacional', label: 'Subfaixas Nacional' },
  { val: 'bathy_0_20_50_75_100_estadual', label: 'Subfaixas Estadual' },
]

export default function SidePanel({
  model, setModel, dataset, setDataset, variable, setVariable, height, setHeight,
  season, setSeason,
  showBathymetry, setShowBathymetry, bathyLayer, setBathyLayer,
  onOpenDashboard,
  showFAQ, setShowFAQ, showProject, setShowProject,
  opacity, setOpacity,
}: SidePanelProps) {
  return (
    <div className="side-panel">
      <div className="header">
        <h1>CNPq WebGIS</h1>
        <p className="subtitle">Visualizador de COGs — {modelLabel(model).toUpperCase()}</p>
      </div>

      <div className="filters">
        <AccordionSection title="Modelo & Experimento">
          <SelectField
            label="Modelo"
            options={MODELS.map(m => ({ val: m, label: modelLabel(m) }))}
            value={model}
            onChange={v => setModel(v as Model)}
          />
          <SearchableSelect
            label="Experimento"
            options={DATASETS.map(d => ({ val: d, label: `${modelLabel(model)} ${datasetLabel(d)}` }))}
            value={dataset}
            onChange={v => setDataset(v as Dataset)}
          />
          <SelectField
            label="Variável"
            options={VARIABLES.map(v => ({ val: v, label: `${varLabel(v).label} (${varLabel(v).unit})` }))}
            value={variable}
            onChange={v => setVariable(v as Variable)}
          />
        </AccordionSection>

        <AccordionSection title="Altura & Estação" defaultOpen={false}>
          <SelectField
            label="Altura"
            options={HEIGHTS.map(h => ({ val: String(h) as any, label: `${h}m` }))}
            value={String(height) as any}
            onChange={v => setHeight(Number(v) as Height)}
          />
          <SelectField
            label="Estação"
            options={SEASONS.map(s => ({ val: s, label: s.toUpperCase() }))}
            value={season}
            onChange={setSeason}
          />
        </AccordionSection>

        <AccordionSection title="Shapefiles de Batimetria" defaultOpen={false}>
          <label className="checkbox-row">
            <input type="checkbox" checked={showBathymetry} onChange={e => setShowBathymetry(e.target.checked)} />
            <span>Mostrar shapefiles</span>
          </label>
          {showBathymetry && (
            <div className="bathy-layers">
              {BATHY_LAYERS.map(bl => (
                <label key={bl.val} className="radio-row">
                  <input type="radio" name="bathyLayer" checked={bathyLayer === bl.val} onChange={() => setBathyLayer(bl.val)} />
                  <span>{bl.label}</span>
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
              onChange={e => setOpacity(Number(e.target.value))}
            />
          </div>
        </AccordionSection>
      </div>

      <div className="footer">
        <p className="footer-info">{modelLabel(model)} {datasetLabel(dataset)} | {varLabel(variable).label} {height}m</p>
        <div className="footer-icons">
          <button className="footer-icon-btn" onClick={() => setShowFAQ(true)} title="FAQ">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/><text x="8" y="11.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">?</text></svg>
            <span>FAQ</span>
          </button>
          <button className="footer-icon-btn" onClick={() => setShowProject(true)} title="Project Info">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/><text x="8" y="11.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor">i</text></svg>
            <span>Project</span>
          </button>
          <button className="footer-icon-btn dashboard-btn" onClick={onOpenDashboard} title="Dashboard">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="9" y="1" width="6" height="3" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="9" y="6" width="6" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
            <span>Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  )
}
