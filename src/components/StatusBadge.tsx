import type { ApplicationStatus } from '../types'

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  saved: 'status-saved',
  applied: 'status-applied',
  interview: 'status-interview',
  offer: 'status-offer',
  rejected: 'status-rejected',
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`status-badge ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}
