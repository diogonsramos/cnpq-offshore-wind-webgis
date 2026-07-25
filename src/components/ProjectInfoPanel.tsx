import { memo } from 'react'
import { useLocale } from '../i18n/provider'
import type { TranslationKey } from '../i18n/types'

interface ProjectInfoPanelProps {
  onClose: () => void
}

const TECH_ROW_COUNT = 11
const PUB_COUNT = 3

function ProjectInfoPanelInner({ onClose }: ProjectInfoPanelProps) {
  const { t } = useLocale()
  const techSummary = Array.from({ length: TECH_ROW_COUNT }, (_, i) => ({
    label: t(`project.tech${i + 1}_label` as TranslationKey),
    value: t(`project.tech${i + 1}_value` as TranslationKey),
  }))
  const publications = Array.from({ length: PUB_COUNT }, (_, i) => t(`project.pub${i + 1}` as TranslationKey))

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
              {techSummary.map((item, i) => (
                <li key={i}><strong>{item.label}:</strong> {item.value}</li>
              ))}
            </ul>
          </Section>

          <Section title={t('project.section.team')}>
            <p>{t('project.team_text')}</p>
          </Section>

          <Section title={t('project.section.publications')}>
            <div className="project-publications">
              {publications.map((pub, i) => (
                <p key={i}>{pub}</p>
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
