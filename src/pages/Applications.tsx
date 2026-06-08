import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  IconBriefcase,
  IconExternalLink,
  IconPlus,
  IconSparkle,
  IconTrash,
} from '../components/icons'
import { ListItemSkeleton } from '../components/Skeleton'
import { StatusBadge } from '../components/StatusBadge'
import { api } from '../lib/api'
import { formatRelativeDate } from '../lib/format'
import type { Application, ApplicationStatus } from '../types'

const STATUSES: ApplicationStatus[] = [
  'saved',
  'applied',
  'interview',
  'offer',
  'rejected',
]

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

type FilterStatus = ApplicationStatus | 'all'

export function Applications() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jobUrl, setJobUrl] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const { applications: list } = await api.listApplications()
      setApplications(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => ({
    total: applications.length,
    active: applications.filter((a) => a.status === 'applied' || a.status === 'interview').length,
    interviews: applications.filter((a) => a.status === 'interview').length,
    offers: applications.filter((a) => a.status === 'offer').length,
  }), [applications])

  const filtered = useMemo(() => {
    if (filter === 'all') return applications
    return applications.filter((app) => app.status === filter)
  }, [applications, filter])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!company.trim() || !role.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await api.createApplication({
        company,
        role,
        jobUrl,
        status: 'saved',
      })
      setCompany('')
      setRole('')
      setJobUrl('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add application.')
    } finally {
      setSubmitting(false)
    }
  }

  async function updateStatus(id: string, status: ApplicationStatus) {
    try {
      await api.updateApplication(id, { status })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this application?')) return
    try {
      await api.deleteApplication(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  return (
    <div className="page applications-page">
      <header className="analyzer-hero apps-hero">
        <div className="analyzer-hero-text">
          <p className="analyzer-eyebrow">
            <IconBriefcase className="analyzer-eyebrow-icon" />
            Application Tracker
          </p>
          <h1>Manage your job search pipeline</h1>
          <p className="analyzer-hero-desc">
            Track every role from saved to offer. Update status, keep job links,
            and stay organized across your search.
          </p>
        </div>
        <div className="apps-hero-stats">
          <div className="apps-stat">
            <strong>{stats.total}</strong>
            <span>Total</span>
          </div>
          <div className="apps-stat">
            <strong>{stats.active}</strong>
            <span>Active</span>
          </div>
          <div className="apps-stat">
            <strong>{stats.interviews}</strong>
            <span>Interviews</span>
          </div>
          <div className="apps-stat">
            <strong>{stats.offers}</strong>
            <span>Offers</span>
          </div>
        </div>
      </header>

      <section className="analyzer-panel apps-add-panel">
        <div className="analyzer-panel-head">
          <div>
            <h2>Add application</h2>
            <p className="muted small">Log a new company and role</p>
          </div>
        </div>

        <form className="apps-add-form" onSubmit={handleAdd}>
          <label className="field-block">
            <span className="field-label">Company</span>
            <input
              type="text"
              className="field-input"
              placeholder="Company name"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
          </label>
          <label className="field-block">
            <span className="field-label">Role</span>
            <input
              type="text"
              className="field-input"
              placeholder="Job title"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            />
          </label>
          <label className="field-block field-block-wide">
            <span className="field-label">Job URL</span>
            <input
              type="url"
              className="field-input"
              placeholder="https://… (optional)"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            <IconPlus className="btn-icon" />
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </form>

        {error && <div className="analyzer-error" role="alert">{error}</div>}
      </section>

      <section className="apps-list-section">
        <div className="apps-list-toolbar">
          <h2>Your applications</h2>
          <div className="filter-chips" role="tablist" aria-label="Filter by status">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All ({applications.length})
            </button>
            {STATUSES.map((status) => {
              const count = applications.filter((a) => a.status === status).length
              if (count === 0 && filter !== status) return null
              return (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={filter === status}
                  className={filter === status ? 'active' : ''}
                  onClick={() => setFilter(status)}
                >
                  {STATUS_LABELS[status]} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <ul className="app-card-list">
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
          </ul>
        ) : filtered.length === 0 ? (
          <div className="apps-empty">
            <div className="analyzer-empty-icon" aria-hidden>
              <IconSparkle />
            </div>
            <h3>{applications.length === 0 ? 'No applications yet' : 'No matches'}</h3>
            <p className="muted">
              {applications.length === 0
                ? 'Add your first role above to start tracking your pipeline.'
                : 'Try a different status filter.'}
            </p>
          </div>
        ) : (
          <>
            <div className="table-wrap app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Link</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <strong className="app-company">{app.company}</strong>
                      </td>
                      <td>{app.role}</td>
                      <td>
                        <select
                          value={app.status}
                          onChange={(e) =>
                            updateStatus(app.id, e.target.value as ApplicationStatus)
                          }
                          aria-label={`Status for ${app.company}`}
                          className="status-select status-select-inline"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="muted small">
                        {formatRelativeDate(app.updatedAt)}
                      </td>
                      <td>
                        {app.jobUrl ? (
                          <a
                            href={app.jobUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="link-with-icon"
                          >
                            <IconExternalLink />
                            View
                          </a>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-icon-only"
                          onClick={() => void handleDelete(app.id)}
                          aria-label={`Delete ${app.company}`}
                        >
                          <IconTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="app-card-list">
              {filtered.map((app) => (
                <li key={app.id} className="app-card">
                  <div className="app-card-head">
                    <div>
                      <strong>{app.company}</strong>
                      <span className="muted small">{app.role}</span>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="app-card-meta muted small">
                    Updated {formatRelativeDate(app.updatedAt)}
                  </div>
                  <div className="app-card-actions">
                    <select
                      value={app.status}
                      onChange={(e) =>
                        updateStatus(app.id, e.target.value as ApplicationStatus)
                      }
                      aria-label={`Status for ${app.company}`}
                      className="status-select"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    {app.jobUrl && (
                      <a
                        href={app.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost btn-sm"
                      >
                        <IconExternalLink className="btn-icon" />
                        Job link
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => void handleDelete(app.id)}
                    >
                      <IconTrash className="btn-icon" />
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
