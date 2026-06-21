import type { TabId } from './TabBar'
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

const SCENARIOS = [
  {
    icon: '🔵',
    name: 'ERA5_atlas',
    forcing: 'ERA5',
    period: '2004–2024',
    desc: 'Reanálise com downscaling WRF — cenário atual de referência',
  },
  {
    icon: '📊',
    name: 'HIST',
    forcing: 'ERA5',
    period: '2004–2014',
    desc: 'WRF Histórico — período de treinamento para correção de viés',
  },
  {
    icon: '🟡',
    name: 'SSP2-4.5',
    forcing: 'CMIP6 (18 modelos)',
    period: '2015–2023 + 2030–2050',
    desc: 'Cenário de mitigação moderada (~4,5 W/m²)',
  },
  {
    icon: '🔴',
    name: 'SSP5-8.5',
    forcing: 'CMIP6 (18 modelos)',
    period: '2015–2023 + 2030–2050',
    desc: 'Cenário de emissões elevadas (~8,5 W/m²)',
  },
]

const TEAM = [
  { name: 'Davidson Martins Moreira', role: 'Coordenador', badge: 'coord' as const },
  { name: 'Diogo Nunes da Silva Ramos', role: 'Pesquisador Líder', badge: 'lead' as const },
  { name: 'Allan Rodrigues Silva', role: 'Pesquisador Líder', badge: 'lead' as const },
  { name: 'Thalyta Soares dos Santos', role: 'Pesquisadora', badge: null },
  { name: 'Francisco José de Lopes Lima', role: 'Pesquisador', badge: null },
  { name: 'Wendy Mary da Silveira Pires', role: 'Pesquisadora', badge: null },
  { name: 'Georgynio Yossimar Rosales Aylas', role: 'Pesquisador', badge: null },
  { name: 'Arthur Lúcide Cotta Weyll', role: 'Pesquisador', badge: null },
  { name: 'Luan Santos de Oliveira Silva', role: 'Pesquisador', badge: null },
  { name: 'Marcelo Pizzuti Pes', role: 'Pesquisador', badge: null },
  { name: 'Ana Paula Paes dos Santos', role: 'Pesquisadora', badge: null },
  { name: 'William Duarte Jacondino', role: 'Pesquisador', badge: null },
  { name: 'Hallan Souza de Jesus', role: 'Pesquisador', badge: null },
  { name: 'Yasmin Kaore Lago Kitagawa', role: 'Pesquisadora', badge: null },
  { name: 'Rosiberto Salustiano da Silva Júnior', role: 'Pesquisador', badge: null },
  { name: 'Allan Cavalcante Araujo', role: 'Pesquisador', badge: null },
  { name: 'Sofia Alexandrino Lage', role: 'Pesquisadora', badge: null },
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

const logoBase = import.meta.env.BASE_URL + 'images/logos/'

export default function LandingPage({ onNavigate }: Props) {
  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="lp-navbar">
        <div className="lp-navbar-logos">
          <img src={logoBase + 'logo-peob-cnpq.png'} alt="PEOB CNPq" className="lp-navbar-logo" />
          <img src={logoBase + 'logo-cnpq.png'} alt="CNPq" className="lp-navbar-logo" />
        </div>
        <button className="lp-navbar-enter" onClick={() => onNavigate('map')}>
          Entrar no Sistema →
        </button>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
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
      <section className="lp-stats">
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
      <section className="lp-tech">
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
              As simulações foram conduzidas com o modelo <strong>WRF-ARW v4</strong> em dois domínios aninhados:
              D01 (27 km) cobrindo a América do Sul e D02 (9 km) focado na costa brasileira, abrangendo
              os 17 estados costeiros.
            </p>
            <p>
              O conjunto de dados cobre <strong>quatro experimentos climáticos</strong>: ERA5_atlas (2004–2024),
              HIST (2004–2014), SSP2-4.5 e SSP5-8.5 (2015–2050), forçados respectivamente por ERA5 e
              por um ensemble de 18 modelos CMIP6 com correção de viés pelo método QDM.
            </p>
            <p>
              As variáveis disponíveis no frontend — velocidade do vento (<strong>ws</strong>, m/s) e densidade
              de potência eólica (<strong>wpd</strong>, W/m²) — são servidas em formato COG e GeoParquet para
              consultas espaciais eficientes.
            </p>
          </div>
          <div>
            <table className="lp-tech-table">
              <thead>
                <tr>
                  <th>Indicador</th>
                  <th>Valor</th>
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
      <section className="lp-scenarios">
        <div className="lp-scenarios-inner">
          <p className="lp-section-label">Experimentos climáticos</p>
          <h2 className="lp-section-title">Cenários Simulados</h2>
          <div className="lp-scenarios-grid">
            {SCENARIOS.map(s => (
              <div className="lp-scenario-card" key={s.name}>
                <span className="lp-scenario-icon">{s.icon}</span>
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
      <section className="lp-gallery">
        <p className="lp-section-label">Interface</p>
        <h2 className="lp-section-title">Visualizações do Sistema</h2>
        <div className="lp-gallery-grid">
          {/* Substituir por <img> quando screenshots estiverem disponíveis em public/images/screenshots/ */}
          <div className="lp-gallery-placeholder">
            <span className="lp-gallery-placeholder-icon">🗺️</span>
            WebGIS Map — Velocidade do Vento (ERA5_atlas)
          </div>
          <div className="lp-gallery-placeholder">
            <span className="lp-gallery-placeholder-icon">📈</span>
            Dashboard — Perfil Vertical
          </div>
          <div className="lp-gallery-placeholder">
            <span className="lp-gallery-placeholder-icon">📊</span>
            Dashboard — Weibull
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="lp-team">
        <div className="lp-team-inner">
          <p className="lp-section-label">Pesquisadores</p>
          <h2 className="lp-section-title">Equipe do Projeto</h2>
          <div className="lp-team-grid">
            {TEAM.map(m => (
              <div className="lp-team-card" key={m.name}>
                <div className="lp-team-name">{m.name}</div>
                <div className="lp-team-role">{m.role}</div>
                {m.badge === 'coord' && <span className="lp-badge lp-badge--coord">Coordenador</span>}
                {m.badge === 'lead' && <span className="lp-badge lp-badge--lead">Pesquisador Líder</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Publications */}
      <section className="lp-publications">
        <p className="lp-section-label">Produção científica</p>
        <h2 className="lp-section-title">Publicações Científicas</h2>
        <ol className="lp-pub-list">
          {PUBLICATIONS.map((pub, i) => (
            <li key={i}>{pub}</li>
          ))}
        </ol>
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
          </div>
        </div>
      </footer>
    </div>
  )
}
