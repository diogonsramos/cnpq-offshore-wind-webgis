import { memo } from 'react'
import { useLocale } from '../i18n/provider'
import type { TranslationKey } from '../i18n/types'

interface ProjectInfoPanelProps {
  onClose: () => void
}




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

  const TECH_TABLE_ROWS: [string, string][] = [
    [t('project.tech1_label'), t('project.tech1_value')],
    [t('project.tech2_label'), t('project.tech2_value')],
    [t('project.tech3_label'), t('project.tech3_value')],
    [t('project.tech4_label'), t('project.tech4_value')],
    [t('project.tech5_label'), t('project.tech5_value')],
    [t('project.tech6_label'), t('project.tech6_value')],
    [t('project.tech7_label'), t('project.tech7_value')],
    [t('project.tech8_label'), t('project.tech8_value')],
    [t('project.tech9_label'), t('project.tech9_value')],
    [t('project.tech10_label'), t('project.tech10_value')],
    [t('project.tech11_label'), t('project.tech11_value')],
  ]

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
