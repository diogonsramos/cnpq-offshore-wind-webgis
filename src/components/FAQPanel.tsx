import { memo, useState } from 'react'
import { useLocale } from '../i18n/provider'
import type { TranslationKey } from '../i18n/types'

interface FAQPanelProps {
  onClose: () => void
}

const FAQ_COUNT = 20

function FAQPanelInner({ onClose }: FAQPanelProps) {
  const { t } = useLocale()
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: t(`faq.q${i + 1}` as TranslationKey),
    a: t(`faq.a${i + 1}` as TranslationKey),
  }))

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <span>{t('faq.panel_title')}</span>
          <button className="drawer-close" onClick={onClose} aria-label={t('faq.close_aria')}>&times;</button>
        </div>
        <div className="drawer-body">
          {faqs.map((faq, i) => (
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
