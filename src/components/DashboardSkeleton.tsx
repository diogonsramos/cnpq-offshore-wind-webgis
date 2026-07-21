import './DashboardSkeleton.css'

export default function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" data-testid="dashboard-skeleton">
      <div className="dv-skeleton-grid">
        <div className="dv-skeleton-card" />
        <div className="dv-skeleton-card" />
        <div className="dv-skeleton-card" />
        <div className="dv-skeleton-card" />
      </div>
    </div>
  )
}
