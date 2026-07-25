import { Component, type ReactNode } from 'react'
import { useLocale } from '../i18n/provider'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

function DefaultFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useLocale()
  return (
    <div className="pixel-panel open" style={{ position: 'absolute', top: 0, right: 0, width: 340, height: '100%', background: '#fff', boxShadow: '-2px 0 12px rgba(0,0,0,0.12)', zIndex: 20, display: 'flex', flexDirection: 'column' }}>
      <div className="pixel-panel-header">
        <span>{t('pixel.header')}</span>
      </div>
      <div className="pixel-panel-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <p className="pixel-panel-status">{t('error_boundary.load_failed')}</p>
        <button onClick={onRetry} style={{ padding: '6px 16px', border: '1px solid #4a90d9', borderRadius: 6, background: '#fff', color: '#4a90d9', cursor: 'pointer', fontSize: 12 }}>
          {t('error_boundary.retry')}
        </button>
      </div>
    </div>
  )
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultFallback onRetry={this.handleRetry} />
    }
    return this.props.children
  }
}
