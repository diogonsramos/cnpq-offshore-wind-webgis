import { useEffect, useState, useCallback } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useLocale } from '../i18n/provider'
import './TourGuide.css'

export function useTourGuide() {
  const { t } = useLocale()

  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      nextBtnText: t('tour.next' as any) || 'Próximo',
      prevBtnText: t('tour.prev' as any) || 'Anterior',
      doneBtnText: t('tour.done' as any) || 'Concluir',
      allowClose: false,
      steps: [
        {
          element: '.side-panel',
          popover: {
            title: t('tour.step1_title' as any) || 'Filtros de Clima',
            description: t('tour.step1_desc' as any) || 'Aqui você define o modelo atmosférico, cenário de emissões e a variável desejada.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '.map-area',
          popover: {
            title: t('tour.step2_title' as any) || 'Mapa Central',
            description: t('tour.step2_desc' as any) || 'Clique em qualquer ponto da costa para extrair a série temporal e gerar análises dinâmicas daquele pixel.',
            side: 'left',
            align: 'center'
          }
        },
        {
          element: '.gh-nav-link:nth-child(4)', // Dashboard tab in header
          popover: {
            title: t('tour.step3_title' as any) || 'Dashboard Global',
            description: t('tour.step3_desc' as any) || 'Após selecionar um ponto, acesse o Dashboard para ver a Rosa dos Ventos, Distribuição de Weibull e os Perfis Verticais.',
            side: 'bottom',
            align: 'center'
          }
        }
      ]
    })
    
    driverObj.drive()
  }, [t])

  return { startTour }
}

export function useDashboardTour() {
  const { t } = useLocale()

  const startDashboardTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      nextBtnText: t('tour.next' as any) || 'Próximo',
      prevBtnText: t('tour.prev' as any) || 'Anterior',
      doneBtnText: t('tour.done' as any) || 'Concluir',
      allowClose: false,
      steps: [
        {
          element: '.dv-filter-bar-unified',
          popover: {
            title: t('tour.db_step1_title' as any) || 'Filtros Globais',
            description: t('tour.db_step1_desc' as any) || 'Altere o modelo, experimento, variável e altura para todo o Dashboard.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '.minimap-container',
          popover: {
            title: t('tour.db_step2_title' as any) || 'Mini-mapa e Locais',
            description: t('tour.db_step2_desc' as any) || 'Adicione até 3 pontos de interesse clicando no mapa ou digitando as coordenadas.',
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '.geoparquet-filters',
          popover: {
            title: t('tour.db_step3_title' as any) || 'Análise Regional',
            description: t('tour.db_step3_desc' as any) || 'Filtre milhares de pixels instantaneamente por faixas de batimetria e estados costeiros.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '.dv-chart-grid',
          popover: {
            title: t('tour.db_step4_title' as any) || 'Gráficos Analíticos',
            description: t('tour.db_step4_desc' as any) || 'Visualize histogramas, perfis verticais, rosas dos ventos e boxplots que comparam as regiões.',
            side: 'left',
            align: 'start'
          }
        }
      ]
    })
    
    driverObj.drive()
  }, [t])

  return { startDashboardTour }
}

export function TourWrapper({ tab }: { tab: string }) {
  const { startTour } = useTourGuide()
  
  // Only show the auto-trigger modal on the map tab
  if (tab !== 'map') return null
  return <TourModal onStart={startTour} />
}

export function TourModal({ onStart }: { onStart: () => void }) {
  const { t } = useLocale()
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Check local storage on mount
    const hasCompleted = localStorage.getItem('hasCompletedTour')
    if (!hasCompleted) {
      // Delay slightly so it doesn't flash before the map renders
      const timer = setTimeout(() => setShow(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  if (!show) return null

  const handleDecline = () => {
    localStorage.setItem('hasCompletedTour', 'true')
    setShow(false)
  }

  const handleAccept = () => {
    localStorage.setItem('hasCompletedTour', 'true')
    setShow(false)
    onStart()
  }

  return (
    <div className="tour-modal-overlay">
      <div className="tour-modal-content">
        <h2>{t('tour.modal_title' as any) || 'Bem-vindo ao Atlas Eólico Offshore!'}</h2>
        <p>{t('tour.modal_desc' as any) || 'Deseja um tour rápido pelas funcionalidades?'}</p>
        <div className="tour-modal-actions">
          <button className="tour-btn-decline" onClick={handleDecline}>
            {t('tour.modal_decline' as any) || 'Não, obrigado'}
          </button>
          <button className="tour-btn-accept" onClick={handleAccept}>
            {t('tour.modal_accept' as any) || 'Sim, iniciar tour'}
          </button>
        </div>
      </div>
    </div>
  )
}
