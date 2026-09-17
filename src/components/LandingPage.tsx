import { useState, useEffect, useRef } from 'react'
import type { TabId } from '../types'
import { useLocale } from '../i18n/provider'
import type { TranslationKey } from '../i18n/types'
import LocaleToggle from './LocaleToggle'
import './LandingPage.css'

interface Props {
  onNavigate: (tab: TabId) => void
}


const TEAM: {
  name: string
  roleKey: TranslationKey
  badge: 'coord' | 'lead' | null
  photo: string
  lattes: string
}[] = [
    { name: 'Davidson Martins Moreira', roleKey: 'landing.team.role_coord', badge: 'coord', photo: 'davidson_martins_moreira.png', lattes: 'https://lattes.cnpq.br/2331953711858907' },
    { name: 'Diogo Nunes da Silva Ramos', roleKey: 'landing.team.role_lead', badge: 'lead', photo: 'diogo_nunes_da_silva_ramos.png', lattes: 'https://lattes.cnpq.br/1800868291881642' },
    { name: 'Allan Rodrigues Silva', roleKey: 'landing.team.role_lead', badge: 'lead', photo: 'allan_rodrigues_silva.png', lattes: 'https://lattes.cnpq.br/3039238491404721' },
    { name: 'Thalyta Soares dos Santos', roleKey: 'landing.team.role_researcher_f', badge: null, photo: 'thalyta_soares_dos_santos.png', lattes: 'https://lattes.cnpq.br/1562606151582291' },
    { name: 'Francisco José de Lopes Lima', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'francisco_jose_lopes_de_lima.png', lattes: 'https://lattes.cnpq.br/8300602270954491' },
    { name: 'Wendy Mary da Silveira Pires', roleKey: 'landing.team.role_researcher_f', badge: null, photo: 'wendy_mary_da_silveira_pires.png', lattes: 'https://lattes.cnpq.br/4862701131287048' },
    { name: 'Georgynio Yossimar Rosales Aylas', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'georgynio_yossimar_rosales_aylas.png', lattes: 'https://lattes.cnpq.br/2713639453901216' },
    { name: 'Arthur Lúcide Cotta Weyll', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'arthur_lucide_cotta_weyll.png', lattes: 'https://lattes.cnpq.br/0409673252774301' },
    { name: 'Luan Santos de Oliveira Silva', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'luan_santos_de_oliveira_silva.png', lattes: 'https://lattes.cnpq.br/5923452659289478' },
    { name: 'Marcelo Pizzuti Pes', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'marcelo_pizzuti_pes.png', lattes: 'https://lattes.cnpq.br/5614389162739082' },
    { name: 'Ana Paula Paes dos Santos', roleKey: 'landing.team.role_researcher_f', badge: null, photo: 'ana_paula_paes_dos_santos.png', lattes: 'https://lattes.cnpq.br/0287853035799329' },
    { name: 'William Duarte Jacondino', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'william_duarte_jacondino.png', lattes: 'https://lattes.cnpq.br/1111671373753798' },
    { name: 'Hallan Souza de Jesus', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'hallan_souza_de_jesus.png', lattes: 'https://lattes.cnpq.br/1996145337862107' },
    { name: 'Yasmin Kaore Lago Kitagawa', roleKey: 'landing.team.role_researcher_f', badge: null, photo: 'default_image.png', lattes: 'https://lattes.cnpq.br/5503607216137253' },
    { name: 'Rosiberto Salustiano da Silva Júnior', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'rosiberto_salustiano_da_silva_junior.png', lattes: 'https://lattes.cnpq.br/1798232201205174' },
    { name: 'Allan Cavalcante Araujo', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'allan_cavalcante_araujo.png', lattes: 'https://lattes.cnpq.br/5127547423362922' },
    { name: 'Sofia Alexandrino Lage', roleKey: 'landing.team.role_researcher_f', badge: null, photo: 'sofia_alexandrino_lage.png', lattes: 'https://lattes.cnpq.br/8666873652216091' },
  ]

// Citações bibliográficas — reproduzidas verbatim (não traduzidas) nos dois
// idiomas, como qualquer lista de referências científicas.
const PUBLICATIONS = [
  <>AYLAS, G. Y. R. et al. <strong>Simulation of an anomalously high wind gust event in São Paulo: A comparative analysis between WRF and MPAS-A models.</strong> Theor Appl Climatol 157, 644 (2026).</>,
  <>WEYLL, A. L. C. et al. <strong>Mapeamento eólico offshore histórico e futuro usando Quantile Delta Mapping com ajuste de erros do downscaling CMIP6-WRF.</strong> In: XI SAPCT e X ICPAD, 2026, Salvador.</>,
  <>RAMOS, D. N. S. et al. <strong>MPAS-A OR WRF: WHICH IS THE BETTER WIND DOWNSCALING TOOL FOR WIND POTENTIAL MAPPING IN BRAZIL?</strong> In: I SIEME, 2025, Maceió.</>,
  <>AYLAS, G. Y. R. et al. <strong>ANALYZING HEAT WAVE IMPACTS ON ELECTRICITY DEMAND AND THERMAL STRESS: A STUDY WITH MPAS-A MODEL IN BAURU-SP.</strong> In: I SIEME, 2025, Maceió.</>,
  <>PIRES, W. M. S. et al. <strong>APPLICATION OF THE MPAS-A MODEL IN EXTREME WIND EVENTS IN SÃO PAULO STATE DURING OCTOBER 2024.</strong> In: I SIEME, 2025, Maceió.</>,
  <>WEYLL, A. L. C. et al. <strong>WIND SPEED BIAS CORRECTION FOR OFFSHORE WIND ENERGY: A CMIP6 AND MACHINE LEARNING-BASED APPROACH.</strong> In: I SIEME, 2025, Maceió.</>,
  <>WEYLL, A. L. C. et al. <strong>Correção de bias aplicada ao WRF com modelos clássicos de machine learning.</strong> In: X SAPCT, 2025, Salvador.</>,
  <>PIRES, W. M. S. et al. <strong>Análise e filtragem da quantidade de dados de entrada em modelos dinâmicos: representar o vento offshore atual e futuro.</strong> In: X SAPCT, 2025, Salvador.</>,
  <>AYLAS, G. Y. R. et al. <strong>Análise do potencial energético eólico offshore no Brasil para o ano de 2030 através de modelagem numérica.</strong> In: X SAPCT, 2025, Salvador.</>,
  <>AYLAS, G. Y. R. et al. <strong>Simulação do campo de vento em áreas de topografia complexa: análise comparativa entre os modelos WRF e MPAS-A.</strong> In: X SAPCT, 2025, Salvador.</>,
  <>PIRES, W. M. S. et al. <strong>Cenário atual e futuro do recurso eólico offshore no Brasil: ferramentas e aplicações.</strong> In: IX SAPCT, 2024, Salvador.</>,
]

const NAV_SECTIONS: { id: string; labelKey: TranslationKey }[] = [
  { id: 'metodologia', labelKey: 'landing.nav.methodology' },
  { id: 'equipe', labelKey: 'landing.nav.team' },
  { id: 'publicacoes', labelKey: 'landing.nav.publications' },
  { id: 'faq', labelKey: 'landing.nav.faq' },
]

const FAQ_COUNT = 20

const logoBase = import.meta.env.BASE_URL + 'images/logos/'
const teamBase = import.meta.env.BASE_URL + 'images/team/'
const defaultPhoto = teamBase + 'default_image.png'

const CMIP6_MODELS = [
  { id: 1, name: 'ACCESS-CM2', inst: 'Commonwealth Scientific and Industrial Research Organisation (Australia)', res: '1.875° × 1.25°' },
  { id: 2, name: 'ACCESS-ESM1-5', inst: 'Commonwealth Scientific and Industrial Research Organisation (Australia)', res: '1.875° × 1.25°' },
  { id: 3, name: 'CanESM5', inst: 'Canadian Centre for Climate Modelling and Analysis (Canada)', res: '2.81° × 2.81°' },
  { id: 4, name: 'BCC-CSM2-MR', inst: 'Beijing Climate Center (China)', res: '1.125° × 1.125°' },
  { id: 5, name: 'FGOALS-f3-L', inst: 'Institute of Atmospheric Physics, Chinese Academy of Sciences (China)', res: '1.25° × 1°' },
  { id: 6, name: 'FGOALS-g3', inst: 'Institute of Atmospheric Physics, Chinese Academy of Sciences (China)', res: '2° × 2.25°' },
  { id: 7, name: 'EC-Earth3', inst: 'European EC-Earth Consortium (Europe)', res: '0.70° × 0.70°' },
  { id: 8, name: 'EC-Earth3-Veg', inst: 'European EC-Earth Consortium (Europe)', res: '0.70° × 0.70°' },
  { id: 9, name: 'IPSL-CM6A-LR', inst: 'Institute Pierre Simon Laplace (France)', res: '2.5° × 1.26°' },
  { id: 10, name: 'AWI-CM-1-1-MR', inst: 'Alfred Wegener Institute, Helmholtz Centre for Polar and Marine Research (Germany)', res: '0.94° × 0.94°' },
  { id: 11, name: 'MPI-ESM1-2-HR', inst: 'Max Planck Institute for Meteorology (Germany)', res: '0.94° × 0.94°' },
  { id: 12, name: 'MPI-ESM1-2-LR', inst: 'Max Planck Institute for Meteorology (Germany)', res: '1.875° × 1.875°' },
  { id: 13, name: 'MIROC6', inst: 'Japan Agency for Marine-Earth Science and Technology (Japan)', res: '1.41° × 1.41°' },
  { id: 14, name: 'MRI-ESM2-0', inst: 'Meteorological Research Institute, Japan Meteorological Agency (Japan)', res: '1.125° × 1.125°' },
  { id: 15, name: 'NorESM2-LM', inst: 'Norwegian Climate Center (Norway)', res: '2.5° × 1.875°' },
  { id: 16, name: 'CESM2', inst: 'Climate and Global Dynamics Laboratory, National Center for Atmospheric Research (USA)', res: '1.25° × 0.94°' },
  { id: 17, name: 'CESM2-WACCM', inst: 'Climate and Global Dynamics Laboratory, National Center for Atmospheric Research (USA)', res: '1.25° × 0.94°' },
  { id: 18, name: 'GFDL-ESM4', inst: 'Geophysical Fluid Dynamics Laboratory, National Oceanic and Atmospheric Administration (USA)', res: '1.25° × 1.0°' }
]

const BIAS_CORRECTED_VARS = [
  { nameKey: 'landing.data.var_tos' as const, acronym: 'tos', levels: '1', hist: '✓', ssp245: '✓', ssp585: '✓' },
  { nameKey: 'landing.data.var_psl' as const, acronym: 'psl', levels: '1', hist: '✓', ssp245: '✓', ssp585: '✓' },
  { nameKey: 'landing.data.var_ps' as const, acronym: 'ps', levels: '1', hist: '✓', ssp245: '✓', ssp585: '✓' },
  { nameKey: 'landing.data.var_ta' as const, acronym: 'ta', levels: '14', hist: '✓', ssp245: '✓', ssp585: '✓' },
  { nameKey: 'landing.data.var_ua' as const, acronym: 'ua', levels: '14', hist: '✓', ssp245: '✓', ssp585: '✓' },
  { nameKey: 'landing.data.var_va' as const, acronym: 'va', levels: '14', hist: '✓', ssp245: '✓', ssp585: '✓' },
  { nameKey: 'landing.data.var_hur' as const, acronym: 'hur', levels: '14', hist: '✓', ssp245: '✓', ssp585: '✓' },
  { nameKey: 'landing.data.var_zg' as const, acronym: 'zg', levels: '14', hist: '✓', ssp245: '✓', ssp585: '✓' },
  { nameKey: 'landing.data.var_tsl' as const, acronym: 'tsl', levels: '4', hist: '✓', ssp245: '✓', ssp585: '✓' },
  { nameKey: 'landing.data.var_mrsol' as const, acronym: 'mrsol', levels: '4', hist: '✓', ssp245: '✓', ssp585: '✓' }
]

export default function LandingPage({ onNavigate }: Props) {
  const { t, locale } = useLocale()
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoPlaying, setVideoPlaying] = useState(true)
  const [videoMuted, setVideoMuted] = useState(false)
  const [videoVolume, setVideoVolume] = useState(0.2)
  const [showVideoModal, setShowVideoModal] = useState(false)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = videoVolume
    }
  }, [videoVolume])

  useEffect(() => {
    const OFFSETS = NAV_SECTIONS.map(s => s.id)

    const onScroll = () => {
      const y = window.scrollY + 80

      setShowBackToTop(y > 400)

      for (let i = OFFSETS.length - 1; i >= 0; i--) {
        const el = document.getElementById(OFFSETS[i])
        if (el && el.offsetTop <= y) {
          setActiveSection(OFFSETS[i])
          return
        }
      }
      setActiveSection('')
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])


  const TECH_TABLE_ROWS: [string, string][] = [
    [t('landing.tech.row1_label'), t('landing.tech.row1_value')],
    [t('landing.tech.row2_label'), t('landing.tech.row2_value')],
    [t('landing.tech.row3_label'), t('landing.tech.row3_value')],
    [t('landing.tech.row4_label'), t('landing.tech.row4_value')],
    [t('landing.tech.row5_label'), t('landing.tech.row5_value')],
    [t('landing.tech.row6_label'), t('landing.tech.row6_value')],
    [t('landing.tech.row7_label'), t('landing.tech.row7_value')],
    [t('landing.tech.row8_label'), t('landing.tech.row8_value')],
  ]

  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: t(`faq.q${i + 1}` as TranslationKey),
    a: t(`faq.a${i + 1}` as TranslationKey),
  }))

  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="lp-navbar" aria-label={t('landing.nav.aria')}>
        <div className="lp-navbar-logos">
          <img src={logoBase + 'logo-peob-cnpq.png'} alt="PEOB CNPq" className="lp-navbar-logo" />
          <a href="http://dgp.cnpq.br/dgp/espelhogrupo/1792812078303607" target="_blank" rel="noopener noreferrer">
            <img src={logoBase + 'logo-cnpq.png'} alt="CNPq" className="lp-navbar-logo" />
          </a>
          <a href="https://www.senaicimatec.com.br" target="_blank" rel="noopener noreferrer">
            <img src={logoBase + 'logo-senai-cimatec.png'} alt="SENAI CIMATEC" className="lp-navbar-logo" />
          </a>
        </div>
        <div className="lp-navbar-anchors" role="navigation" aria-label={t('landing.nav.sections_aria')}>
          {NAV_SECTIONS.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`lp-nav-anchor${activeSection === s.id ? ' active' : ''}`}
            >
              {t(s.labelKey)}
            </a>
          ))}
        </div>
        <LocaleToggle className="lp-navbar-locale" />
      </nav>

      {/* Hero */}
      <section id="inicio" className="lp-hero">
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          muted={videoMuted}
          src={`${import.meta.env.BASE_URL}video/background.mp4`}
          className="lp-hero-video"
          onTimeUpdate={(e) => {
            if (e.currentTarget.currentTime >= 8.04) {
              e.currentTarget.currentTime = 0;
              e.currentTarget.play().catch(() => {});
            }
          }}
        />

        <div className="lp-hero-video-controls">
          <button 
            className="lp-video-btn" 
            onClick={() => {
              if (videoRef.current) {
                if (videoPlaying) videoRef.current.pause()
                else videoRef.current.play()
                setVideoPlaying(!videoPlaying)
              }
            }}
            title={videoPlaying ? 'Pause' : 'Play'}
          >
            {videoPlaying ? '⏸' : '▶️'}
          </button>
          <button 
            className="lp-video-btn" 
            onClick={() => setVideoMuted(!videoMuted)}
            title={videoMuted ? 'Unmute' : 'Mute'}
          >
            {videoMuted ? '🔇' : '🔊'}
          </button>
          <input 
            type="range" 
            className="lp-video-volume-slider" 
            min="0" 
            max="1" 
            step="0.05" 
            value={videoVolume} 
            onChange={(e) => {
              setVideoVolume(parseFloat(e.target.value))
              if (videoMuted && parseFloat(e.target.value) > 0) setVideoMuted(false)
            }}
            title="Volume"
          />
          <button 
            className="lp-video-btn" 
            onClick={() => setShowVideoModal(true)}
            title="Ver Vídeo Completo"
          >
            ⛶
          </button>
        </div>

        <div className="lp-hero-content">
          <p className="lp-hero-eyebrow">{t('landing.hero.eyebrow')}</p>
          <h1>{t('landing.hero.title')}</h1>
          <div className="lp-hero-ctas">
          <button className="lp-cta-primary" onClick={() => onNavigate('map')}>
            {t('landing.hero.cta_primary')}
          </button>
          <button className="lp-cta-secondary" onClick={() => onNavigate('dashboard')}>
            {t('landing.hero.cta_secondary')}
          </button>
        </div>
        </div>
      </section>

      {/* Tech Summary */}
      <section id="metodologia" className="lp-tech">
        <p className="lp-section-label">{t('landing.tech.eyebrow')}</p>
        <h2 className="lp-section-title">{t('landing.tech.title')}</h2>
        <div className="lp-tech-grid">
          <div className="lp-tech-text">
            <p>{t('landing.tech.p1')}</p>
            <p>{t('landing.tech.p2')}</p>
            <p>{t('landing.tech.p3')}</p>
            <p>{t('landing.tech.p4')}</p>
            <figure className="lp-tech-figure">
              <img src={`${import.meta.env.BASE_URL}images/fluxograma_${locale === 'pt-BR' ? 'br' : locale === 'en' ? 'en' : 'sp'}.svg`} alt="Pipeline e Fluxograma do Sistema" className="lp-pipeline-image" />
            </figure>
            <p>{t('landing.tech.p5')}</p>
          </div>
          <div className="lp-tech-table-wrap">
            <table className="lp-tech-table">
              <thead>
                <tr>
                  <th scope="col">{t('landing.tech.table_indicator_col')}</th>
                  <th scope="col">{t('landing.tech.table_value_col')}</th>
                </tr>
              </thead>
              <tbody>
                {TECH_TABLE_ROWS.map(([ind, val]) => (
                  <tr key={ind}>
                    <td>{ind}</td>
                    <td>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>


      {/* Dados */}
      <section id="dados" className="lp-tech">
        <div className="lp-tech-inner">
          <p className="lp-section-label">{t('landing.data.eyebrow')}</p>
          <h2 className="lp-section-title">{t('landing.data.title')}</h2>
          <div className="lp-tech-text">
            <p>{t('landing.data.desc_era5')}</p>
            <p>{t('landing.data.desc_cmip6')}</p>
            <div style={{ margin: '2rem 0', overflowX: 'auto' }}>
              <table className="lp-tech-table" style={{ width: '100%', minWidth: '700px', margin: '0 auto', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>{t('landing.data.table_no')}</th>
                    <th>{t('landing.data.table_model')}</th>
                    <th>{t('landing.data.table_institution')}</th>
                    <th>{t('landing.data.table_resolution')}</th>
                  </tr>
                </thead>
                <tbody>
                  {CMIP6_MODELS.map(m => (
                    <tr key={m.id}>
                      <td>{m.id}</td>
                      <td>{m.name}</td>
                      <td>{m.inst}</td>
                      <td>{m.res}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>{t('landing.data.desc_bias_correction')}</p>
            <div style={{ margin: '2rem 0', overflowX: 'auto' }}>
              <table className="lp-tech-table" style={{ width: '100%', minWidth: '700px', margin: '0 auto', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>{t('landing.data.table_variables')}</th>
                    <th>{t('landing.data.table_acronym')}</th>
                    <th>{t('landing.data.table_levels')}</th>
                    <th>{t('landing.data.table_historical')}</th>
                    <th>{t('landing.data.table_ssp245')}</th>
                    <th>{t('landing.data.table_ssp585')}</th>
                  </tr>
                </thead>
                <tbody>
                  {BIAS_CORRECTED_VARS.map(v => (
                    <tr key={v.acronym}>
                      <td>{t(v.nameKey)}</td>
                      <td>{v.acronym}</td>
                      <td>{v.levels}</td>
                      <td>{v.hist}</td>
                      <td>{v.ssp245}</td>
                      <td>{v.ssp585}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="lp-citation">{t('landing.data.citation')}</p>
          </div>
        </div>
      </section>

      {/* Parametrizações Físicas */}
      <section className="lp-tech">
        <div className="lp-tech-inner">
          <p className="lp-section-label">{t('landing.params.eyebrow')}</p>
          <h2 className="lp-section-title">{t('landing.params.title')}</h2>
          <div className="lp-tech-table-wrap" style={{ margin: '3rem auto' }}>
            <table className="lp-tech-table">
              <thead>
                <tr>
                  <th scope="col">{t('landing.params.col_component')}</th>
                  <th scope="col">{t('landing.params.col_config')}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>{t('landing.params.microphysics')}</td><td>WRF Single-Moment 6-class (WSM6)</td></tr>
                <tr><td>{t('landing.params.convection')}</td><td>New Tiedtke</td></tr>
                <tr><td>{t('landing.params.longwave')}</td><td>RRTMG</td></tr>
                <tr><td>{t('landing.params.shortwave')}</td><td>RRTMG shortwave</td></tr>
                <tr><td>{t('landing.params.pbl')}</td><td>YSU</td></tr>
                <tr><td>{t('landing.params.surface')}</td><td>Revised MM5 Monin-Obukhov</td></tr>
                <tr><td>{t('landing.params.lsm')}</td><td>Noah Land Surface Model</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>



      {/* Team */}
      <section id="equipe" className="lp-team">
        <div className="lp-team-inner">
          <p className="lp-section-label">{t('landing.team.eyebrow')}</p>
          <h2 className="lp-section-title">{t('landing.team.title')}</h2>
          <p className="lp-section-intro">
            {t('landing.team.intro_before')}
            <abbr title={t('landing.team.intro_abbr_title')}>CS2I — SENAI CIMATEC</abbr>
            {t('landing.team.intro_after')}
          </p>
          <div className="lp-team-grid">
            {TEAM.map(m => (
              <a
                className={`lp-team-card${m.badge === 'coord' ? ' lp-team-card--coord' : m.badge === 'lead' ? ' lp-team-card--lead' : ''}`}
                key={m.name}
                href={m.lattes}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('landing.team.lattes_aria', { name: m.name })}
              >
                <div className="lp-team-avatar-wrap">
                  <img
                    className="lp-team-avatar"
                    src={teamBase + m.photo}
                    alt={`Foto de ${m.name}`}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultPhoto }}
                    loading="lazy"
                  />
                </div>
                <div className="lp-team-info">
                  <div className="lp-team-name">{m.name}</div>
                  <div className="lp-team-role">{t(m.roleKey)}</div>
                  {m.badge === 'coord' && <span className="lp-badge lp-badge--coord">{t('landing.team.role_coord')}</span>}
                  {m.badge === 'lead' && <span className="lp-badge lp-badge--lead">{t('landing.team.role_lead')}</span>}
                  <span className="lp-team-lattes-hint" aria-hidden="true">{t('landing.team.lattes_hint')}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Parceiros */}
      <section className="lp-tech">
        <div className="lp-tech-inner" style={{ textAlign: 'center' }}>
          <p className="lp-section-label">{t('landing.partners.eyebrow')}</p>
          <h2 className="lp-section-title">{t('landing.partners.title')}</h2>
          <div style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t('landing.partners.cca_title')}</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li><a href="https://senaicimatec.com.br/servico/supercomputacao-cloud-e-ciberseguranca/" target="_blank" rel="noopener noreferrer">{t('landing.partners.link_hpc')}</a></li>
                <li><a href="http://dgp.cnpq.br/dgp/espelhogrupo/1792812078303607" target="_blank" rel="noopener noreferrer">{t('landing.partners.link_cnpq_group')}</a></li>
                <li><a href="https://cpaiai.senaicimatec.com.br/pt/acoes/centro-ciencias-atmosfericas" target="_blank" rel="noopener noreferrer">{t('landing.partners.link_cpaia')}</a></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Publications */}
      <section id="publicacoes" className="lp-publications">
        <p className="lp-section-label">{t('landing.publications.eyebrow')}</p>
        <h2 className="lp-section-title">{t('landing.publications.title')}</h2>
        <p className="lp-section-intro">{t('landing.publications.intro')}</p>
        <div className="lp-pub-grid">
          {PUBLICATIONS.map((pub, i) => (
            <div className="lp-pub-card" key={i}>
              <span className="lp-pub-num" aria-hidden="true">{i + 1}</span>
              <div className="lp-pub-content">{pub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Releases */}
      <section id="releases" className="lp-tech">
        <div className="lp-tech-inner">
          <p className="lp-section-label">{t('landing.releases.eyebrow')}</p>
          <h2 className="lp-section-title">{t('landing.releases.title')}</h2>
          <div className="lp-tech-text">
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.4rem', color: '#4a90d9', marginBottom: '0.5rem' }}>{t('landing.releases.v1_0.title')}</h3>
              <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                <li>{t('landing.releases.v1_0.li1')}</li>
                <li>{t('landing.releases.v1_0.li2')}</li>
                <li>{t('landing.releases.v1_0.li3')}</li>
                <li>{t('landing.releases.v1_0.li4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="lp-faq">
        <div className="lp-faq-inner">
          <p className="lp-section-label">{t('landing.faq.eyebrow')}</p>
          <h2 className="lp-section-title">{t('landing.faq.title')}</h2>
          <p className="lp-section-intro">
            {t('landing.faq.intro_before')}
            <button className="lp-faq-enter-link" onClick={() => onNavigate('map')}>
              {t('landing.faq.intro_link')}
            </button>
            {t('landing.faq.intro_after')}
          </p>
          <div className="lp-faq-list">
            {faqs.map((faq, i) => (
              <div className={`lp-faq-item${openFaqIdx === i ? ' lp-faq-item--open' : ''}`} key={i}>
                <button
                  className="lp-faq-question"
                  onClick={() => setOpenFaqIdx(openFaqIdx === i ? null : i)}
                  aria-expanded={openFaqIdx === i}
                >
                  <span>{faq.q}</span>
                  <span className="lp-faq-icon" aria-hidden="true">{openFaqIdx === i ? '−' : '+'}</span>
                </button>
                {openFaqIdx === i && (
                  <div className="lp-faq-answer">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      {showVideoModal && (
        <div className="lp-video-modal-overlay" onClick={() => setShowVideoModal(false)}>
          <div className="lp-video-modal-content" onClick={e => e.stopPropagation()}>
            <button className="lp-video-modal-close" onClick={() => setShowVideoModal(false)}>✕</button>
            <video 
              autoPlay 
              controls 
              src={`${import.meta.env.BASE_URL}video/background.mp4`} 
              className="lp-video-modal-player"
              onTimeUpdate={(e) => {
                if (e.currentTarget.currentTime >= 8.04) {
                  e.currentTarget.currentTime = 0;
                  e.currentTarget.play().catch(() => {});
                }
              }}
            />
          </div>
        </div>
      )}

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-logos">
            <img src={logoBase + 'logo-cnpq.png'} alt="CNPq" className="lp-footer-logo" />
            <img src={logoBase + 'logo-peob-cnpq.png'} alt="PEOB CNPq" className="lp-footer-logo" />
            <img src={logoBase + 'logo-senai-cimatec.png'} alt="SENAI CIMATEC" className="lp-footer-logo" />
          </div>
          <div className="lp-footer-citation">
            {t('landing.footer.citation_line1')}<br />
            {t('landing.footer.citation_line2')}<br />
            {t('landing.footer.citation_line3')}
          </div>
          <div className="lp-footer-copyright">
            {t('landing.footer.copyright')}
            <br />
            <span className="lp-footer-updated">{t('landing.footer.updated')}</span>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      {showBackToTop && (
        <button
          className="lp-back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label={t('landing.footer.back_to_top_aria')}
        >
          ↑
        </button>
      )}
    </div>
  )
}
