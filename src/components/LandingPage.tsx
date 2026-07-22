import { useState, useEffect } from 'react'
import type { TabId } from '../types'
import { FAQS } from '../lib/metadata'
import './LandingPage.css'

interface Props {
  onNavigate: (tab: TabId) => void
}

const STATS = [
  { value: 'WRF-ARW v4', label: 'Modelo atmosférico' },
  { value: '9 km (D02)', label: 'Resolução horizontal' },
  { value: '10 · 50 · 100 · 150 · 200 m', label: 'Alturas de saída' },
  { value: '4', label: 'Experimentos' },
  { value: '17', label: 'Estados costeiros cobertos' },
]

type ScenarioKind = 'historical' | 'future'

const SCENARIOS: {
  icon: string
  name: string
  forcing: string
  period: string
  desc: string
  kind: ScenarioKind
}[] = [
  {
    icon: '🔵',
    name: 'ERA5_atlas',
    forcing: 'ERA5',
    period: '2004–2024',
    desc: 'Reanálise com downscaling WRF — cenário atual de referência para atlas eólico',
    kind: 'historical',
  },
  {
    icon: '📊',
    name: 'HIST',
    forcing: 'ERA5',
    period: '2004–2014',
    desc: 'WRF Histórico — período de treinamento para correção de viés (QDM)',
    kind: 'historical',
  },
  {
    icon: '🟡',
    name: 'SSP2-4.5',
    forcing: 'CMIP6 (18 modelos)',
    period: '2015–2023 + 2030–2050',
    desc: 'Cenário de mitigação moderada — forçante radiativa ~4,5 W/m²',
    kind: 'future',
  },
  {
    icon: '🔴',
    name: 'SSP5-8.5',
    forcing: 'CMIP6 (18 modelos)',
    period: '2015–2023 + 2030–2050',
    desc: 'Cenário de emissões elevadas — forçante radiativa ~8,5 W/m²',
    kind: 'future',
  },
]

const TEAM: {
  name: string
  role: string
  badge: 'coord' | 'lead' | null
  photo: string
  lattes: string
}[] = [
  { name: 'Davidson Martins Moreira', role: 'Coordenador', badge: 'coord', photo: 'davidson_martins_moreira.png', lattes: 'http://lattes.cnpq.br/2331953711858907' },
  { name: 'Diogo Nunes da Silva Ramos', role: 'Pesquisador Líder', badge: 'lead', photo: 'diogo_nunes_da_silva_ramos.png', lattes: 'http://lattes.cnpq.br/1800868291881642' },
  { name: 'Allan Rodrigues Silva', role: 'Pesquisador Líder', badge: 'lead', photo: 'allan_rodrigues_silva.png', lattes: 'http://lattes.cnpq.br/3039238491404721' },
  { name: 'Thalyta Soares dos Santos', role: 'Pesquisadora', badge: null, photo: 'thalyta_soares_dos_santos.png', lattes: 'http://lattes.cnpq.br/1562606151582291' },
  { name: 'Francisco José de Lopes Lima', role: 'Pesquisador', badge: null, photo: 'francisco_jose_lopes_de_lima.png', lattes: 'http://lattes.cnpq.br/8300602270954491' },
  { name: 'Wendy Mary da Silveira Pires', role: 'Pesquisadora', badge: null, photo: 'wendy_mary_da_silveira_pires.png', lattes: 'http://lattes.cnpq.br/4862701131287048' },
  { name: 'Georgynio Yossimar Rosales Aylas', role: 'Pesquisador', badge: null, photo: 'georgynio_yossimar_rosales_aylas.png', lattes: 'http://lattes.cnpq.br/2713639453901216' },
  { name: 'Arthur Lúcide Cotta Weyll', role: 'Pesquisador', badge: null, photo: 'arthur_lucide_cotta_weyll.png', lattes: 'http://lattes.cnpq.br/0409673252774301' },
  { name: 'Luan Santos de Oliveira Silva', role: 'Pesquisador', badge: null, photo: 'luan_santos_de_oliveira_silva.png', lattes: 'http://lattes.cnpq.br/5923452659289478' },
  { name: 'Marcelo Pizzuti Pes', role: 'Pesquisador', badge: null, photo: 'marcelo_pizzuti_pes.png', lattes: 'http://lattes.cnpq.br/5614389162739082' },
  { name: 'Ana Paula Paes dos Santos', role: 'Pesquisadora', badge: null, photo: 'ana_paula_paes_dos_santos.png', lattes: 'http://lattes.cnpq.br/0287853035799329' },
  { name: 'William Duarte Jacondino', role: 'Pesquisador', badge: null, photo: 'william_duarte_jacondino.png', lattes: 'http://lattes.cnpq.br/1111671373753798' },
  { name: 'Hallan Souza de Jesus', role: 'Pesquisador', badge: null, photo: 'hallan_souza_de_jesus.png', lattes: 'http://lattes.cnpq.br/1996145337862107' },
  { name: 'Yasmin Kaore Lago Kitagawa', role: 'Pesquisadora', badge: null, photo: 'default_image.png', lattes: 'http://lattes.cnpq.br/5503607216137253' },
  { name: 'Rosiberto Salustiano da Silva Júnior', role: 'Pesquisador', badge: null, photo: 'rosiberto_salustiano_da_silva_junior.png', lattes: 'http://lattes.cnpq.br/1798232201205174' },
  { name: 'Allan Cavalcante Araujo', role: 'Pesquisador', badge: null, photo: 'allan_cavalcante_araujo.png', lattes: 'http://lattes.cnpq.br/5127547423362922' },
  { name: 'Sofia Alexandrino Lage', role: 'Pesquisadora', badge: null, photo: 'sofia_alexandrino_lage.png', lattes: 'http://lattes.cnpq.br/8666873652216091' },
]

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

const TECH_TABLE_ROWS = [
  ['Modelo atmosférico', 'WRF-ARW v4 (Weather Research and Forecasting)'],
  ['Domínios aninhados', 'D01: 27 km de resolução; D02: 9 km de resolução'],
  ['Pontos de grade (D02)', '388 × 553 (~214.000 células)'],
  ['Grade regridada (frontend)', '534 × 263 (~140.000 células, ~0,07°)'],
  ['Níveis verticais', '51 níveis (sigma/pressão híbrida)'],
  ['Variáveis (frontend)', 'Velocidade do vento — ws (m/s); Densidade de potência — wpd (W/m²)'],
  ['Volume bruto', '~1,7 TB em NetCDF'],
  ['Produtos processados', '~5.688 COGs; 24 GeoParquet'],
]

const NAV_SECTIONS = [
  { id: 'metodologia', label: 'Metodologia' },
  { id: 'cenarios', label: 'Cenários' },
  { id: 'interface', label: 'Interface' },
  { id: 'equipe', label: 'Equipe' },
  { id: 'publicacoes', label: 'Publicações' },
  { id: 'faq', label: 'FAQ' },
]

const logoBase = import.meta.env.BASE_URL + 'images/logos/'
const teamBase = import.meta.env.BASE_URL + 'images/team/'
const defaultPhoto = teamBase + 'default_image.png'

export default function LandingPage({ onNavigate }: Props) {
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

  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="lp-navbar" aria-label="Navegação principal">
        <div className="lp-navbar-logos">
          <img src={logoBase + 'logo-peob-cnpq.png'} alt="PEOB CNPq" className="lp-navbar-logo" />
          <img src={logoBase + 'logo-cnpq.png'} alt="CNPq" className="lp-navbar-logo" />
        </div>
        <div className="lp-navbar-anchors" role="navigation" aria-label="Seções da página">
          {NAV_SECTIONS.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`lp-nav-anchor${activeSection === s.id ? ' active' : ''}`}
            >
              {s.label}
            </a>
          ))}
        </div>
        <button className="lp-navbar-enter" onClick={() => onNavigate('map')}>
          Entrar no Sistema →
        </button>
      </nav>

      {/* Hero */}
      <section id="inicio" className="lp-hero">
        <p className="lp-hero-eyebrow">CNPq — Processo 407949/2022-4</p>
        <h1>Cenário atual e futuro do recurso eólico offshore no Brasil</h1>
        <p className="lp-hero-subtitle">Ferramentas e aplicações — Projeto CNPq 407949/2022-4</p>
        <p className="lp-hero-description">
          Downscaling dinâmico WRF-ARW v4 (~9 km) forçado por ERA5 e CMIP6 (SSP2-4.5 e SSP5-8.5)
          para mapear vento e densidade de potência eólica em 5 altitudes na costa brasileira.
        </p>
        <div className="lp-hero-ctas">
          <button className="lp-cta-primary" onClick={() => onNavigate('map')}>
            Abrir WebGIS Map
          </button>
          <button className="lp-cta-secondary" onClick={() => onNavigate('dashboard')}>
            Abrir Analytical Dashboard
          </button>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="lp-stats" aria-label="Indicadores técnicos">
        <p className="lp-stats-title">Principais indicadores técnicos</p>
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
        <p className="lp-section-label">Metodologia</p>
        <h2 className="lp-section-title">Resumo Técnico</h2>
        <div className="lp-tech-grid">
          <div className="lp-tech-text">
            <p>
              O projeto realiza o <strong>mapeamento do potencial eólico offshore brasileiro</strong> utilizando
              simulações climáticas regionais de alta resolução, considerando cenários atuais e
              futuros de mudanças climáticas.
            </p>
            <p>
              As simulações foram conduzidas com o modelo{' '}
              <strong>
                <abbr title="Weather Research and Forecasting — Advanced Research WRF, versão 4">WRF-ARW v4</abbr>
              </strong>{' '}
              em dois domínios aninhados: D01 (27 km) cobrindo a América do Sul e D02 (9 km) focado
              na costa brasileira, abrangendo os 17 estados costeiros.
            </p>
            <p>
              O conjunto de dados cobre <strong>quatro experimentos climáticos</strong>:{' '}
              ERA5_atlas (2004–2024), HIST (2004–2014), SSP2-4.5 e SSP5-8.5 (2015–2050), forçados
              respectivamente por{' '}
              <abbr title="ERA5 — quinta geração de reanálise atmosférica global do ECMWF">ERA5</abbr>{' '}
              e por um ensemble de 18 modelos{' '}
              <abbr title="Coupled Model Intercomparison Project Phase 6 — conjunto de modelos climáticos globais que orientam o IPCC AR6">CMIP6</abbr>{' '}
              com correção de viés pelo método{' '}
              <abbr title="Quantile Delta Mapping — técnica de correção de viés que preserva as tendências climáticas de longo prazo dos modelos">QDM</abbr>.
            </p>
            <p>
              As variáveis disponíveis no frontend — velocidade do vento (<strong>ws</strong>, m/s) e densidade
              de potência eólica (<strong>wpd</strong>, W/m²) — são servidas em formato{' '}
              <abbr title="Cloud Optimized GeoTIFF — formato raster otimizado para acesso parcial via HTTP range requests">COG</abbr>{' '}
              e GeoParquet para consultas espaciais eficientes.
            </p>
          </div>
          <div className="lp-tech-table-wrap">
            <table className="lp-tech-table">
              <thead>
                <tr>
                  <th scope="col">Indicador</th>
                  <th scope="col">Valor</th>
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
          <p className="lp-section-label">Experimentos climáticos</p>
          <h2 className="lp-section-title">Cenários Simulados</h2>
          <div className="lp-scenarios-legend">
            <span className="lp-legend-item lp-legend-item--historical">● Histórico / Referência</span>
            <span className="lp-legend-item lp-legend-item--future">● Projeção Futura (CMIP6)</span>
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

      {/* Gallery */}
      <section id="interface" className="lp-gallery">
        <p className="lp-section-label">Interface</p>
        <h2 className="lp-section-title">Visualizações do Sistema</h2>
        <div className="lp-gallery-grid">
          <button
            className="lp-gallery-card"
            onClick={() => onNavigate('map')}
            aria-label="Abrir WebGIS Map"
          >
            <span className="lp-gallery-card-icon" aria-hidden="true">🗺️</span>
            <span className="lp-gallery-card-title">WebGIS Map</span>
            <span className="lp-gallery-card-desc">Mapa interativo de vento e densidade de potência por altitude, experimento e estado</span>
          </button>
          <button
            className="lp-gallery-card"
            onClick={() => onNavigate('dashboard')}
            aria-label="Abrir Analytical Dashboard — Perfil Vertical"
          >
            <span className="lp-gallery-card-icon" aria-hidden="true">📈</span>
            <span className="lp-gallery-card-title">Dashboard — Perfil Vertical</span>
            <span className="lp-gallery-card-desc">Gráfico de perfil vertical de velocidade do vento por altitude para um ponto selecionado</span>
          </button>
          <button
            className="lp-gallery-card"
            onClick={() => onNavigate('dashboard')}
            aria-label="Abrir Analytical Dashboard — Weibull"
          >
            <span className="lp-gallery-card-icon" aria-hidden="true">📊</span>
            <span className="lp-gallery-card-title">Dashboard — Weibull</span>
            <span className="lp-gallery-card-desc">Distribuição de Weibull e parâmetros k e c da frequência de vento no ponto consultado</span>
          </button>
        </div>
      </section>

      {/* Team */}
      <section id="equipe" className="lp-team">
        <div className="lp-team-inner">
          <p className="lp-section-label">Pesquisadores</p>
          <h2 className="lp-section-title">Equipe do Projeto</h2>
          <p className="lp-section-intro">
            17 pesquisadores do{' '}
            <abbr title="Centro de Supercomputação para Inovação Industrial — SENAI CIMATEC, Salvador, BA">CS2I — SENAI CIMATEC</abbr>{' '}
            cobrindo meteorologia regional, modelagem climática, machine learning e engenharia de software.
          </p>
          <div className={`lp-team-grid${showAllTeam ? '' : ' lp-team-grid--collapsed'}`}>
            {TEAM.map(m => (
              <a
                className={`lp-team-card${m.badge === 'coord' ? ' lp-team-card--coord' : m.badge === 'lead' ? ' lp-team-card--lead' : ''}`}
                key={m.name}
                href={m.lattes}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ver currículo Lattes de ${m.name}`}
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
                  <div className="lp-team-role">{m.role}</div>
                  {m.badge === 'coord' && <span className="lp-badge lp-badge--coord">Coordenador</span>}
                  {m.badge === 'lead' && <span className="lp-badge lp-badge--lead">Pesquisador Líder</span>}
                  <span className="lp-team-lattes-hint" aria-hidden="true">Ver Lattes ↗</span>
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
              ? '↑ Ver menos'
              : `↓ Ver todos os ${TEAM.length} pesquisadores`}
          </button>
        </div>
      </section>

      {/* Publications */}
      <section id="publicacoes" className="lp-publications">
        <p className="lp-section-label">Produção científica</p>
        <h2 className="lp-section-title">Publicações Científicas</h2>
        <p className="lp-section-intro">
          9 trabalhos publicados em simpósios e congressos nacionais e internacionais (2024–2026),
          cobrindo downscaling regional, correção de viés, machine learning e análise do potencial eólico offshore.
        </p>
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
          <p className="lp-section-label">Dúvidas frequentes</p>
          <h2 className="lp-section-title">FAQ</h2>
          <p className="lp-section-intro">
            Respostas sobre dados, metodologia e uso do sistema.{' '}
            <button className="lp-faq-enter-link" onClick={() => onNavigate('map')}>
              Acesse o WebGIS
            </button>{' '}
            para explorar os resultados interativamente.
          </p>
          <div className="lp-faq-list">
            {FAQS.map((faq, i) => (
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
            Cenário atual e futuro do recurso eólico offshore no Brasil: ferramentas e aplicações.<br />
            Projeto 407949/2022-4. Coordenação: Davidson Martins Moreira.<br />
            CS2I — SENAI CIMATEC, Salvador, BA, Brasil.
          </div>
          <div className="lp-footer-disclaimer">
            ⚠️ Os dados disponíveis neste sistema são <strong>preliminares</strong>, para fins de desenvolvimento.
            Os dados finais (otimizados em formato e performance) serão atualizados posteriormente.
          </div>
          <div className="lp-footer-copyright">
            © 2024–2026 CS2I — SENAI CIMATEC. Financiado pelo CNPq — Processo 407949/2022-4.
            <br />
            <span className="lp-footer-updated">Última atualização: junho de 2026</span>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      {showBackToTop && (
        <button
          className="lp-back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Voltar ao topo da página"
        >
          ↑
        </button>
      )}
    </div>
  )
}
