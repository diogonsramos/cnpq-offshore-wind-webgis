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

const SCENARIOS = [
  {
    icon: '🔵', name: 'ERA5 Histórico', forcing: 'ERA5',
    period: '2004–2014', kind: 'historical' as const,
    desc: 'Downscaling WRF/MPAS forçado pela reanálise ERA5 — referência observacional para o período histórico',
  },
  {
    icon: '📊', name: 'CMIP6 BC Histórico', forcing: 'CMIP6 BC (18 modelos)',
    period: '2004–2014', kind: 'historical' as const,
    desc: 'Downscaling WRF/MPAS forçado pelo CMIP6 bias corrected (Xu et al. 2021) — período histórico',
  },
  {
    icon: '🔵', name: 'ERA5 Presente', forcing: 'ERA5',
    period: '2015–2023', kind: 'future' as const,
    desc: 'Downscaling WRF/MPAS forçado pela reanálise ERA5 — período presente de referência',
  },
  {
    icon: '🟡', name: 'CMIP6 BC SSP2-4.5 Presente', forcing: 'CMIP6 BC (18 modelos)',
    period: '2015–2023', kind: 'future' as const,
    desc: 'Downscaling WRF/MPAS — cenário de mitigação moderada (~4,5 W/m²) para o período presente',
  },
  {
    icon: '🔴', name: 'CMIP6 BC SSP5-8.5 Presente', forcing: 'CMIP6 BC (18 modelos)',
    period: '2015–2023', kind: 'future' as const,
    desc: 'Downscaling WRF/MPAS — cenário de emissões elevadas (~8,5 W/m²) para o período presente',
  },
  {
    icon: '🟡', name: 'CMIP6 BC SSP2-4.5 Futuro', forcing: 'CMIP6 BC (18 modelos)',
    period: '2030–2050', kind: 'future' as const,
    desc: 'Downscaling WRF/MPAS — cenário de mitigação moderada (~4,5 W/m²) para o período futuro',
  },
  {
    icon: '🔴', name: 'CMIP6 BC SSP5-8.5 Futuro', forcing: 'CMIP6 BC (18 modelos)',
    period: '2030–2050', kind: 'future' as const,
    desc: 'Downscaling WRF/MPAS — cenário de emissões elevadas (~8,5 W/m²) para o período futuro',
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
  <>AYLAS, G. Y. R. et al. <strong>Simulação do campo de vento em áreas de topografia complexa: análise comparativa entre os modelos WRF e MPAS-A.</strong> In: X SAPCT, 2025, Salvador.</>,
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
    { value: 'WRF v4.6.0 · MPAS v8.1.0', label: 'Modelos atmosféricos' },
    { value: '9 km', label: 'Resolução horizontal' },
    { value: 'ERA5 · CMIP6', label: 'Base de dados' },
    { value: 'Histórico · Presente · Futuro', label: 'Períodos' },
    { value: '10 · 50 · 100 · 150 · 200 m', label: 'Alturas de saída' },
  ]

  const TECH_TABLE_ROWS = [
    ['Modelos atmosféricos', 'WRF-ARW v4.6.0 (Weather Research and Forecasting) e MPAS v8.1.0 (Model for Prediction Across Scales)'],
    ['Domínios aninhados (WRF)', 'D01: 27 km (América do Sul); D02: 9 km (costa brasileira)'],
    ['Grade MPAS', 'Malha global com refinamento regional para ~9 km sobre a costa brasileira'],
    ['Pontos de grade (frontend)', '~250.000 pontos após regridagem para grade lat/lon ~0,08°'],
    ['Condições de contorno', 'ERA5 (reanálise ECMWF, ~31 km) e CMIP6 BC (Xu et al. 2021, ~139 km, 18 modelos) bias corrected'],
    ['Níveis verticais', '51 níveis (sigma/pressão híbrida)'],
    ['Alturas pós-processadas', '10, 50, 100, 150, 200 m (obtidas pela lei da potência com parâmetros atmosféricos do modelo)'],
    ['Variáveis (frontend)', 'Velocidade do vento — ws (m/s); Densidade de potência — wpd (W/m²)'],
    ['Períodos', 'Histórico (2004–2014), Presente (2015–2023), Futuro (2030–2050)'],
    ['Volume bruto de entrada', '~20 TB (ERA5: 15 TB; CMIP6 BC: 5,4 TB)'],
    ['Produtos processados', '700 COGs; GeoParquet por experimento e modelo'],
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
        <p className="lp-hero-description">
          Downscaling dinâmico WRF v4.6.0 e MPAS v8.1.0 (~9 km) forçado por ERA5 e CMIP6 BC (SSP2-4.5 e SSP5-8.5) para mapear vento e densidade de potência eólica em 5 altitudes (10, 50, 100, 150, 200 m) na costa brasileira.
        </p>
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
            <p>O projeto realiza o mapeamento do potencial eólico offshore brasileiro utilizando simulações climáticas regionais de alta resolução com dois modelos atmosféricos distintos, considerando cenários atuais e futuros de mudanças climáticas. O conjunto de dados cobre três períodos — histórico (2004–2014), presente (2015–2023) e futuro (2030–2050) — forçados pela reanálise ERA5 (ECMWF) e pelo CMIP6 BC (Xu et al. 2021, doi: 10.1038/s41597-021-01079-3), um conjunto bias corrected de 18 modelos climáticos globais.</p>
            <p>A energia eólica offshore é uma fronteira estratégica para a transição energética brasileira. No entanto, a avaliação precisa do recurso eólico requer dados de alta resolução espacial e temporal que capturem a complexidade da circulação atmosférica na costa brasileira, incluindo fenômenos como brisas marítimas, jatos de baixos níveis e interações com a topografia costeira.</p>
            <p>As simulações foram conduzidas com os modelos WRF-ARW v4.6.0 (Weather Research and Forecasting) e MPAS v8.1.0 (Model for Prediction Across Scales). O WRF utiliza dois domínios aninhados: D01 (27 km) cobrindo a América do Sul e D02 (9 km) focado na costa brasileira, abrangendo os 17 estados costeiros. O MPAS opera com malha global de resolução variável, com refinamento para ~9 km sobre a região de interesse, eliminando a necessidade de domínios aninhados e permitindo a representação consistente de teleconexões atmosféricas.</p>
            <p>As condições de contorno provêm de duas bases: ERA5 (reanálise global do ECMWF, resolução original de ~31 km) e CMIP6 BC (Xu et al. 2021), que fornece dados bias corrected de 18 modelos CMIP6 para os cenários SSP2-4.5 (mitigação moderada) e SSP5-8.5 (emissões elevadas) com resolução original de ~1,25°. Ambos os conjuntos de entrada foram padronizados para ~9 km após o downscaling dinâmico.</p>
            <p>O conjunto de dados abrange três períodos: histórico (2004–2014, forçado por ERA5 e CMIP6 BC HIST), presente (2015–2023, forçado por ERA5 e CMIP6 BC SSP2-4.5/SSP5-8.5) e futuro (2030–2050, forçado por CMIP6 BC SSP2-4.5/SSP5-8.5). O período 2015–2023 foi simulado para fins de treinamento dos modelos de machine learning para bias correction ajustado à costa brasileira (processamento em andamento).</p>
            <p>As variáveis disponíveis no frontend — velocidade do vento (ws, m/s) e densidade de potência eólica (wpd, W/m²) — são servidas em formato COG (Cloud Optimized GeoTIFF) para visualização no mapa interativo e GeoParquet para consultas espaciais eficientes. O sistema permite consultar estatísticas por pixel (média, mínimo, máximo, desvio padrão, parâmetros de Weibull, rosa dos ventos e perfil vertical em 5 altitudes), comparar até 3 localizações no dashboard analítico e exportar dados. Futuras atualizações incluirão a versão com bias correction QDM (Quantile Delta Mapping) dos resultados.</p>
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
            <span className="lp-legend-item lp-legend-item--historical">ERA5 (observacional)</span>
            <span className="lp-legend-item lp-legend-item--future">CMIP6 BC (climático)</span>
          </div>
          <div className="lp-scenarios-grid">
            {SCENARIOS.map(s => (
              <div className={`lp-scenario-card lp-scenario-card--${s.kind}`} key={s.name}>
                <span className="lp-scenario-icon" aria-hidden="true">{s.icon}</span>
                <div className="lp-scenario-name">{s.name}</div>
                <div className="lp-scenario-forcing">{s.forcing}</div>
                <div className="lp-scenario-period">{s.period}</div>
                <p className="lp-scenario-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Parametrizações Físicas */}
      <section className="lp-tech">
        <div className="lp-tech-inner">
          <p className="lp-section-label">Parâmetros Internos</p>
          <h2 className="lp-section-title">Configurações Físicas Compartilhadas</h2>
          <div className="lp-tech-table-wrap" style={{ margin: '3rem auto' }}>
            <table className="lp-tech-table">
              <thead>
                <tr>
                  <th scope="col">Componente</th>
                  <th scope="col">Configuração</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Microfísica</td><td>WRF Single-Moment 6-class (WSM6)</td></tr>
                <tr><td>Convecção</td><td>New Tiedtke</td></tr>
                <tr><td>Radiação de Onda Longa</td><td>RRTMG</td></tr>
                <tr><td>Radiação de Onda Curta</td><td>RRTMG shortwave</td></tr>
                <tr><td>Camada Limite Planetária (PBL)</td><td>YSU</td></tr>
                <tr><td>Camada de Superfície</td><td>Revised MM5 Monin-Obukhov</td></tr>
                <tr><td>Física de Superfície (LSM)</td><td>Noah Land Surface Model</td></tr>
              </tbody>
            </table>
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
            <img src={`${import.meta.env.BASE_URL}images/screenshots/screenshot-01-webgis-map.webp`} alt="WebGIS Map screenshot" className="lp-gallery-screenshot" loading="lazy" />
            <div className="lp-gallery-card-overlay">
              <span className="lp-gallery-card-title">{t('landing.gallery.map_title')}</span>
              <span className="lp-gallery-card-desc">{t('landing.gallery.map_desc')}</span>
            </div>
          </button>
          <button
            className="lp-gallery-card"
            onClick={() => onNavigate('dashboard')}
            aria-label={t('landing.gallery.dashboard_profile_aria')}
          >
            <img src={`${import.meta.env.BASE_URL}images/screenshots/screenshot-04-dashboard-bars.webp`} alt="Dashboard Bars screenshot" className="lp-gallery-screenshot" loading="lazy" />
            <div className="lp-gallery-card-overlay">
              <span className="lp-gallery-card-title">{t('landing.gallery.dashboard_profile_title')}</span>
              <span className="lp-gallery-card-desc">{t('landing.gallery.dashboard_profile_desc')}</span>
            </div>
          </button>
          <button
            className="lp-gallery-card"
            onClick={() => onNavigate('dashboard')}
            aria-label={t('landing.gallery.dashboard_weibull_aria')}
          >
            <img src={`${import.meta.env.BASE_URL}images/screenshots/screenshot-05-dashboard-all.webp`} alt="Dashboard Charts screenshot" className="lp-gallery-screenshot" loading="lazy" />
            <div className="lp-gallery-card-overlay">
              <span className="lp-gallery-card-title">{t('landing.gallery.dashboard_weibull_title')}</span>
              <span className="lp-gallery-card-desc">{t('landing.gallery.dashboard_weibull_desc')}</span>
            </div>
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
          <p className="lp-section-label">Apoio e Infraestrutura</p>
          <h2 className="lp-section-title">Instituições Parceiras</h2>
          <div style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Centro de Ciências Atmosféricas — SENAI CIMATEC</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li><a href="https://senaicimatec.com.br/servico/supercomputacao-cloud-e-ciberseguranca/" target="_blank" rel="noopener noreferrer">Supercomputação, cloud e cibersegurança</a></li>
                <li><a href="http://dgp.cnpq.br/dgp/espelhogrupo/1792812078303607" target="_blank" rel="noopener noreferrer">Grupo de Pesquisa CNPq</a></li>
                <li><a href="https://cpaia.senaicimatec.com.br/pt" target="_blank" rel="noopener noreferrer">CPA-IA (Centro de Pesquisa Aplicada em Inteligência Artificial)</a></li>
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Instituições Parceiras</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>Instituto Nacional de Pesquisas Espaciais — INPE</li>
                <li>NVIDIA</li>
                <li>NCAR/EUA — National Center for Atmospheric Research</li>
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
