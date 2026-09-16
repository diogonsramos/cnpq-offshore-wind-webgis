import { memo } from 'react'
import { useLocale } from '../i18n/provider'
import type { TranslationKey } from '../i18n/types'

interface ProjectInfoPanelProps {
  onClose: () => void
}

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

function ProjectInfoPanelInner({ onClose }: ProjectInfoPanelProps) {
  const { t } = useLocale()

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <span>{t('project.panel_title')}</span>
          <button className="drawer-close" onClick={onClose} aria-label={t('project.close_aria')}>&times;</button>
        </div>
        <div className="drawer-body">
          <Section title={t('project.section.funding')}>
            <p><strong>CNPq — {t('project.funding_grant_number')}</strong></p>
            <p className="project-highlight">"{t('project.funding_title')}"</p>
            <p>{t('project.funding_description')}</p>
            <p className="project-acknowledge">{t('project.funding_acknowledgment')}</p>
          </Section>

          <Section title={t('project.section.tech_summary')}>
            <ul>
              {TECH_TABLE_ROWS.map(([label, value], i) => (
                <li key={i}><strong>{label}:</strong> {value}</li>
              ))}
            </ul>
          </Section>

          <Section title={t('project.section.team')}>
            <p>Pesquisadores do CS2I — SENAI CIMATEC, Salvador, BA.</p>
          </Section>

          <Section title={t('project.section.publications')}>
            <div className="project-publications">
              {PUBLICATIONS.map((pub, i) => (
                <p key={i} className="project-pub-item">{pub}</p>
              ))}
            </div>
          </Section>

          <Section title={t('project.section.contact')}>
            <p>{t('project.contact_text')}</p>
          </Section>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="project-section">
      <h3 className="project-section-title">{title}</h3>
      {children}
    </div>
  )
}

export default memo(ProjectInfoPanelInner)
