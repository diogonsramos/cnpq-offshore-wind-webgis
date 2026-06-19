import { memo } from 'react'
import { PROJECT_INFO } from '../lib/metadata'

interface ProjectInfoPanelProps {
  onClose: () => void
}

function ProjectInfoPanelInner({ onClose }: ProjectInfoPanelProps) {
  const pi = PROJECT_INFO

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <span>Informações do Projeto</span>
          <button className="drawer-close" onClick={onClose} aria-label="Close Project Info">&times;</button>
        </div>
        <div className="drawer-body">
          <Section title="Financiamento">
            <p><strong>CNPq — {pi.funding.grantNumber}</strong></p>
            <p className="project-highlight">"{pi.funding.title}"</p>
            <p>{pi.funding.description}</p>
            <p className="project-acknowledge">{pi.funding.acknowledgment}</p>
          </Section>

          <Section title="Resumo Técnico">
            <ul>
              {pi.techSummary.map((item, i) => (
                <li key={i}><strong>{item.label}:</strong> {item.value}</li>
              ))}
            </ul>
          </Section>

          <Section title="Equipe">
            <p>{pi.team}</p>
          </Section>

          <Section title="Publicações Relacionadas">
            <div className="project-publications">
              {pi.publications.map((pub, i) => (
                <p key={i}>{pub}</p>
              ))}
            </div>
          </Section>

          <Section title="Contato">
            <p>{pi.contact}</p>
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
