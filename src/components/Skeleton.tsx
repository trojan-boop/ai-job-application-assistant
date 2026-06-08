export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`skeleton ${className}`.trim()} aria-hidden />
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card stat-card-skeleton">
      <Skeleton className="skeleton-icon" />
      <div className="stat-card-body">
        <Skeleton className="skeleton-value" />
        <Skeleton className="skeleton-label" />
      </div>
    </div>
  )
}

export function ListItemSkeleton() {
  return (
    <li className="recent-item recent-item-skeleton">
      <Skeleton className="skeleton-line-lg" />
      <Skeleton className="skeleton-line-sm" />
    </li>
  )
}
