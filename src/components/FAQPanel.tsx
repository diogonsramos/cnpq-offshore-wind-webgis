import { memo, useState } from 'react'
import { FAQS } from '../lib/metadata'

interface FAQPanelProps {
  onClose: () => void
}

function FAQPanelInner({ onClose }: FAQPanelProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <span>FAQ — Perguntas Frequentes</span>
          <button className="drawer-close" onClick={onClose} aria-label="Close FAQ">&times;</button>
        </div>
        <div className="drawer-body">
          {FAQS.map((faq, i) => (
            <div key={i} className={`faq-item ${openIdx === i ? 'open' : ''}`}>
              <button className="faq-question" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                <span>{i + 1}. {faq.q}</span>
                <span className="faq-arrow">{openIdx === i ? '−' : '+'}</span>
              </button>
              {openIdx === i && <div className="faq-answer">{faq.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default memo(FAQPanelInner)
