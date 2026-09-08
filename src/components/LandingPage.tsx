import { useState, useEffect } from 'react'
import type { TabId } from '../types'
import { useLocale } from '../i18n/provider'
import type { TranslationKey } from '../i18n/types'
import LocaleToggle from './LocaleToggle'
import './LandingPage.css'

interface Props {
  onNavigate: (tab: TabId) => void
}

type ScenarioKind = 'historical' | 'future'

const SCENARIOS: {
  icon: string
  name: string
  forcing: string
  period: string
  descKey: TranslationKey
  kind: ScenarioKind
}[] = [
  {
    icon: '🔵',
    name: 'ERA5_atlas',
    forcing: 'ERA5',
    period: '2004–2024',
    descKey: 'landing.scenarios.era5_desc',
    kind: 'historical',
  },
  {
    icon: '📊',
    name: 'HIST',
    forcing: 'ERA5',
    period: '2004–2014',
    descKey: 'landing.scenarios.hist_desc',
    kind: 'historical',
  },
  {
    icon: '🟡',
    name: 'SSP2-4.5',
    forcing: 'CMIP6 (18 modelos)',
    period: '2015–2023 + 2030–2050',
    descKey: 'landing.scenarios.ssp245_desc',
    kind: 'future',
  },
  {
    icon: '🔴',
    name: 'SSP5-8.5',
    forcing: 'CMIP6 (18 modelos)',
    period: '2015–2023 + 2030–2050',
    descKey: 'landing.scenarios.ssp585_desc',
    kind: 'future',
  },
]

const TEAM: {
  name: string
  roleKey: TranslationKey
  badge: 'coord' | 'lead' | null
  photo: string
  lattes: string
}[] = [
  { name: 'Davidson Martins Moreira', roleKey: 'landing.team.role_coord', badge: 'coord', photo: 'davidson_martins_moreira.png', lattes: 'http://lattes.cnpq.br/2331953711858907' },
  { name: 'Diogo Nunes da Silva Ramos', roleKey: 'landing.team.role_lead', badge: 'lead', photo: 'diogo_nunes_da_silva_ramos.png', lattes: 'http://lattes.cnpq.br/1800868291881642' },
  { name: 'Allan Rodrigues Silva', roleKey: 'landing.team.role_lead', badge: 'lead', photo: 'allan_rodrigues_silva.png', lattes: 'http://lattes.cnpq.br/3039238491404721' },
  { name: 'Thalyta Soares dos Santos', roleKey: 'landing.team.role_researcher_f', badge: null, photo: 'thalyta_soares_dos_santos.png', lattes: 'http://lattes.cnpq.br/1562606151582291' },
  { name: 'Francisco José de Lopes Lima', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'francisco_jose_lopes_de_lima.png', lattes: 'http://lattes.cnpq.br/8300602270954491' },
  { name: 'Wendy Mary da Silveira Pires', roleKey: 'landing.team.role_researcher_f', badge: null, photo: 'wendy_mary_da_silveira_pires.png', lattes: 'http://lattes.cnpq.br/4862701131287048' },
  { name: 'Georgynio Yossimar Rosales Aylas', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'georgynio_yossimar_rosales_aylas.png', lattes: 'http://lattes.cnpq.br/2713639453901216' },
  { name: 'Arthur Lúcide Cotta Weyll', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'arthur_lucide_cotta_weyll.png', lattes: 'http://lattes.cnpq.br/0409673252774301' },
  { name: 'Luan Santos de Oliveira Silva', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'luan_santos_de_oliveira_silva.png', lattes: 'http://lattes.cnpq.br/5923452659289478' },
  { name: 'Marcelo Pizzuti Pes', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'marcelo_pizzuti_pes.png', lattes: 'http://lattes.cnpq.br/5614389162739082' },
  { name: 'Ana Paula Paes dos Santos', roleKey: 'landing.team.role_researcher_f', badge: null, photo: 'ana_paula_paes_dos_santos.png', lattes: 'http://lattes.cnpq.br/0287853035799329' },
  { name: 'William Duarte Jacondino', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'william_duarte_jacondino.png', lattes: 'http://lattes.cnpq.br/1111671373753798' },
  { name: 'Hallan Souza de Jesus', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'hallan_souza_de_jesus.png', lattes: 'http://lattes.cnpq.br/1996145337862107' },
  { name: 'Yasmin Kaore Lago Kitagawa', roleKey: 'landing.team.role_researcher_f', badge: null, photo: 'default_image.png', lattes: 'http://lattes.cnpq.br/5503607216137253' },
  { name: 'Rosiberto Salustiano da Silva Júnior', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'rosiberto_salustiano_da_silva_junior.png', lattes: 'http://lattes.cnpq.br/1798232201205174' },
  { name: 'Allan Cavalcante Araujo', roleKey: 'landing.team.role_researcher_m', badge: null, photo: 'allan_cavalcante_araujo.png', lattes: 'http://lattes.cnpq.br/5127547423362922' },
  { name: 'Sofia Alexandrino Lage', roleKey: 'landing.team.role_researcher_f', badge: null, photo: 'sofia_alexandrino_lage.png', lattes: 'http://lattes.cnpq.br/8666873652216091' },
]

// Citações bibliográficas — reproduzidas verbatim (não traduzidas) nos dois
// idiomas, como qualquer lista de referências científicas.
const PUBLICATIONS = [
  <>WEYLL, A. L. C. et al. <strong>Mapeamento eólico offshore histórico e futuro usando Quantile Delta Mapping com ajuste de erros do downscaling CMIP6-WRF.</strong> In: XI SAPCT e X ICPAD, 2026, Salvador.</>,
  <>RAMOS, D. N. S. et al. <strong>MPAS-A OR WRF: WHICH IS THE BETTER WIND DOWNSCALING TOOL FOR WIND POTENTIAL MAPPING IN BRAZIL?</strong> In: I SIEME, 2025, Maceió.</>,
  <>AYLAS, G. Y. R. et al. <strong>ANALYZING HEAT WAVE IMPACTS ON ELECTRICITY DEMAND AND THERMAL STRESS: A STUDY WITH MPAS-A MODEL IN BAURU-SP.</strong> In: I SIEME, 2025, Maceió.</>,
  <>PIRES, W. M. S. et al. <strong>APPLICATION OF THE MPAS-A MODEL IN EXTREME WIND EVENTS IN SÃO PAULO STATE DURING OCTOBER 2024.</strong> In: I SIEME, 2025, Maceió.</>,
  <>WEYLL, A. L. C. et al. <strong>WIND SPEED BIAS CORRECTION FOR OFFSHORE WIND ENERGY: A CMIP6 AND MACHINE LEARNING-BASED APPROACH.</strong> In: I SIEME, 2025, Maceió.</>,
  <>WEYLL, A. L. C. et al. <strong>Correção de bias aplicada ao WRF com modelos clássicos de machine learning.</strong> In: X SAPCT, 2025, Salvador.</>,
  <>PIRES, W. M. S. et al. <strong>Análise e filtragem da quantidade de dados de entrada em modelos dinâmicos: representar o vento offshore atual e futuro.</strong> In: X SAPCT, 2025, Salvador.</>,
  <>AYLAS, G. Y. R. et al. <strong>Análise do potencial energético eólico offshore no Brasil para o ano de 2030 através de modelagem numérica.</strong> In: X SAPCT, 2025, Salvador.</>,
  <>PIRES, W. M. S. et al. <strong>Cenário atual e futuro do recurso eólico offshore no Brasil: ferramentas e aplicações.</strong> In: IX SAPCT, 2024, Salvador.</>,
]

const NAV_SECTIONS: { id: string; labelKey: TranslationKey }[] = [
  { id: 'metodologia', labelKey: 'landing.nav.methodology' },
  { id: 'cenarios', labelKey: 'landing.nav.scenarios' },
  { id: 'interface', labelKey: 'landing.nav.interface' },
  { id: 'equipe', labelKey: 'landing.nav.team' },
  { id: 'publicacoes', labelKey: 'landing.nav.publications' },
  { id: 'faq', labelKey: 'landing.nav.faq' },
]

const FAQ_COUNT = 20
const TECH_ROW_COUNT = 8

const logoBase = import.meta.env.BASE_URL + 'images/logos/'
const teamBase = import.meta.env.BASE_URL + 'images/team/'
const defaultPhoto = teamBase + 'default_image.png'

export default function LandingPage({ onNavigate }: Props) {
  const { t } = useLocale()
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [showAllTeam, setShowAllTeam] = useState(false)
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null)

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

  const STATS = [
    { value: 'WRF-ARW v4', label: t('landing.stats.model') },
    { value: '9 km (D02)', label: t('landing.stats.resolution') },
    { value: '10 · 50 · 100 · 150 · 200 m', label: t('landing.stats.heights') },
    { value: '4', label: t('landing.stats.experiments') },
    { value: '17', label: t('landing.stats.states') },
  ]

  const TECH_TABLE_ROWS = Array.from({ length: TECH_ROW_COUNT }, (_, i) => [
    t(`landing.tech.row${i + 1}_label` as TranslationKey),
    t(`landing.tech.row${i + 1}_value` as TranslationKey),
  ])

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
          <img src={logoBase + 'logo-cnpq.png'} alt="CNPq" className="lp-navbar-logo" />
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
        <button className="lp-navbar-enter" onClick={() => onNavigate('map')}>
          {t('landing.navbar_enter')}
        </button>
      </nav>

      {/* Hero */}
      <section id="inicio" className="lp-hero">
        <p className="lp-hero-eyebrow">{t('landing.hero.eyebrow')}</p>
        <h1>{t('landing.hero.title')}</h1>
        <p className="lp-hero-subtitle">{t('landing.hero.subtitle')}</p>
        <p className="lp-hero-description">{t('landing.hero.description')}</p>
        <div className="lp-hero-ctas">
          <button className="lp-cta-primary" onClick={() => onNavigate('map')}>
            {t('landing.hero.cta_primary')}
          </button>
          <button className="lp-cta-secondary" onClick={() => onNavigate('dashboard')}>
            {t('landing.hero.cta_secondary')}
          </button>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="lp-stats" aria-label={t('landing.stats.aria')}>
        <p className="lp-stats-title">{t('landing.stats.title')}</p>
        <div className="lp-stats-grid">
          {STATS.map(s => (
            <div className="lp-stat-card" key={s.label}>
              <div className="lp-stat-value">{s.value}</div>
              <div className="lp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Summary */}
      <section id="metodologia" className="lp-tech">
        <p className="lp-section-label">{t('landing.tech.eyebrow')}</p>
        <h2 className="lp-section-title">{t('landing.tech.title')}</h2>
        <div className="lp-tech-grid">
          <div className="lp-tech-text">
            <p>
              {t('landing.tech.p1_before')}<strong>{t('landing.tech.p1_bold')}</strong>{t('landing.tech.p1_after')}
            </p>
            <p>
              {t('landing.tech.p2_before')}
              <strong>
                <abbr title={t('landing.tech.p2_abbr_title')}>WRF-ARW v4</abbr>
              </strong>
              {t('landing.tech.p2_after')}
            </p>
            <p>
              {t('landing.tech.p3_before')}<strong>{t('landing.tech.p3_bold')}</strong>{t('landing.tech.p3_mid1')}
              <abbr title={t('landing.tech.p3_era5_title')}>ERA5</abbr>
              {t('landing.tech.p3_mid2')}
              <abbr title={t('landing.tech.p3_cmip6_title')}>CMIP6</abbr>
              {t('landing.tech.p3_mid3')}
              <abbr title={t('landing.tech.p3_qdm_title')}>QDM</abbr>.
            </p>
            <p>
              {t('landing.tech.p4_before')}<strong>ws</strong>{t('landing.tech.p4_mid1')}<strong>wpd</strong>{t('landing.tech.p4_mid2')}
              <abbr title={t('landing.tech.p4_cog_title')}>COG</abbr>
              {t('landing.tech.p4_after')}
            </p>
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

      {/* Scenarios */}
      <section id="cenarios" className="lp-scenarios">
        <div className="lp-scenarios-inner">
          <p className="lp-section-label">{t('landing.scenarios.eyebrow')}</p>
          <h2 className="lp-section-title">{t('landing.scenarios.title')}</h2>
          <div className="lp-scenarios-legend">
            <span className="lp-legend-item lp-legend-item--historical">{t('landing.scenarios.legend_historical')}</span>
            <span className="lp-legend-item lp-legend-item--future">{t('landing.scenarios.legend_future')}</span>
          </div>
          <div className="lp-scenarios-grid">
            {SCENARIOS.map(s => (
              <div className={`lp-scenario-card lp-scenario-card--${s.kind}`} key={s.name}>
                <span className="lp-scenario-icon" aria-hidden="true">{s.icon}</span>
                <div className="lp-scenario-name">{s.name}</div>
                <div className="lp-scenario-forcing">{s.forcing}</div>
                <div className="lp-scenario-period">{s.period}</div>
                <p className="lp-scenario-desc">{t(s.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section id="interface" className="lp-gallery">
        <p className="lp-section-label">{t('landing.gallery.eyebrow')}</p>
        <h2 className="lp-section-title">{t('landing.gallery.title')}</h2>
        <div className="lp-gallery-grid">
          <button
            className="lp-gallery-card"
            onClick={() => onNavigate('map')}
            aria-label={t('landing.hero.cta_primary')}
          >
            <span className="lp-gallery-card-icon" aria-hidden="true">🗺️</span>
            <span className="lp-gallery-card-title">{t('landing.gallery.map_title')}</span>
            <span className="lp-gallery-card-desc">{t('landing.gallery.map_desc')}</span>
          </button>
          <button
            className="lp-gallery-card"
            onClick={() => onNavigate('dashboard')}
            aria-label={t('landing.gallery.dashboard_profile_aria')}
          >
            <span className="lp-gallery-card-icon" aria-hidden="true">📈</span>
            <span className="lp-gallery-card-title">{t('landing.gallery.dashboard_profile_title')}</span>
            <span className="lp-gallery-card-desc">{t('landing.gallery.dashboard_profile_desc')}</span>
          </button>
          <button
            className="lp-gallery-card"
            onClick={() => onNavigate('dashboard')}
            aria-label={t('landing.gallery.dashboard_weibull_aria')}
          >
            <span className="lp-gallery-card-icon" aria-hidden="true">📊</span>
            <span className="lp-gallery-card-title">{t('landing.gallery.dashboard_weibull_title')}</span>
            <span className="lp-gallery-card-desc">{t('landing.gallery.dashboard_weibull_desc')}</span>
          </button>
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
          <div className={`lp-team-grid${showAllTeam ? '' : ' lp-team-grid--collapsed'}`}>
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
          <button
            className="lp-team-toggle"
            onClick={() => setShowAllTeam(v => !v)}
            aria-expanded={showAllTeam}
          >
            {showAllTeam
              ? t('landing.team.toggle_show_less')
              : t('landing.team.toggle_show_all', { count: TEAM.length })}
          </button>
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
          <div className="lp-footer-disclaimer">
            {t('landing.footer.disclaimer_before')}<strong>{t('landing.footer.disclaimer_bold')}</strong>{t('landing.footer.disclaimer_after')}
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
