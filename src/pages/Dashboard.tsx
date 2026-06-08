import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import {
  IconArrowRight,
  IconBriefcase,
  IconChart,
  IconDocument,
  IconMail,
  IconSparkle,
} from '../components/icons'
import { ListItemSkeleton, StatCardSkeleton } from '../components/Skeleton'
import { StatusBadge } from '../components/StatusBadge'
import { api } from '../lib/api'
import { formatRelativeDate, getGreeting } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import type { Application, ApplicationStatus } from '../types'

type DashboardData = {
  llmEnabled: boolean
  llmLabel: string
  llmSetupHint: string
  applications: Application[]
}

const WORKFLOW_STEPS = [
  { step: 1, title: 'Analyze your resume', desc: 'Upload a PDF or paste text for an ATS score.', to: '/analyzer' },
  { step: 2, title: 'Tailor to the job', desc: 'Add the job description for keyword matching.', to: '/analyzer' },
  { step: 3, title: 'Generate a cover letter', desc: 'Create a role-specific draft in seconds.', to: '/cover-letter' },
  { step: 4, title: 'Track applications', desc: 'Log companies and update your pipeline status.', to: '/applications' },
]

function countByStatus(applications: Application[], status: ApplicationStatus) {
  return applications.filter((app) => app.status === status).length
}

export function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setError('')
      try {
        const [health, apps] = await Promise.all([
          api.health(),
          api.listApplications(),
        ])
        if (!cancelled) {
          setData({
            llmEnabled: health.llmEnabled,
            llmLabel: health.llmLabel ?? 'Rule-based mode',
            llmSetupHint: health.llmSetupHint ?? 'Add a free API key to enable AI.',
            applications: apps.applications,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard.')
          setData({
            llmEnabled: false,
            llmLabel: 'Rule-based mode',
            llmSetupHint: 'Add GROQ_API_KEY or GEMINI_API_KEY to your .env file.',
            applications: [],
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const apps = data?.applications ?? []
    return {
      total: apps.length,
      active: countByStatus(apps, 'applied') + countByStatus(apps, 'interview'),
      interviews: countByStatus(apps, 'interview'),
      offers: countByStatus(apps, 'offer'),
    }
  }, [data?.applications])

  const recentApplications = useMemo(() => {
    const apps = data?.applications ?? []
    return [...apps]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
  }, [data?.applications])

  const firstName = user?.name?.split(/\s+/)[0] ?? 'there'

  return (
    <div className="page dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-content">
          <p className="dashboard-eyebrow">{getGreeting()}</p>
          <h1>Welcome back, {firstName}</h1>
          <p className="dashboard-subtitle">
            Your job search command center — analyze resumes, write cover letters,
            and track every application in one place.
          </p>
          <div className="dashboard-hero-actions">
            <Link to="/analyzer" className="btn btn-primary">
              <IconChart className="btn-icon" />
              Check ATS score
            </Link>
            <Link to="/applications" className="btn btn-ghost">
              <IconBriefcase className="btn-icon" />
              View applications
            </Link>
          </div>
        </div>
        <div className="dashboard-hero-aside">
          <div className="system-status">
            <span className="system-status-label">System status</span>
            {loading ? (
              <span className="system-pill system-pill-loading">Loading…</span>
            ) : data?.llmEnabled ? (
              <span className="system-pill system-pill-ai">
                <IconSparkle className="pill-icon" />
                {data.llmLabel}
              </span>
            ) : (
              <span className="system-pill system-pill-rules">Rule-based mode</span>
            )}
            <p className="system-status-hint muted small">
              {data?.llmSetupHint ?? 'Add GROQ_API_KEY (free) to enable AI.'}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="dashboard-alert" role="alert">
          {error}
        </div>
      )}

      <section className="dashboard-stats" aria-label="Overview statistics">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Total applications" value={stats.total} icon={IconBriefcase} />
            <StatCard label="In progress" value={stats.active} icon={IconDocument} accent="accent" />
            <StatCard label="Interviews" value={stats.interviews} icon={IconChart} accent="warning" />
            <StatCard label="Offers" value={stats.offers} icon={IconSparkle} accent="success" />
          </>
        )}
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-main">
          <header className="section-header">
            <h2>Quick actions</h2>
            <p className="muted small">Jump into your most-used tools</p>
          </header>
          <div className="feature-grid">
            <FeatureCard
              to="/analyzer"
              title="Resume Analyzer"
              description="Upload a PDF or paste your resume for a detailed ATS score, keyword gaps, and tailored suggestions."
              icon={IconChart}
              cta="Analyze resume"
              highlight
            />
            <FeatureCard
              to="/cover-letter"
              title="Cover Letter Generator"
              description="Generate a professional, role-specific cover letter from your resume and the job posting."
              icon={IconMail}
              cta="Write cover letter"
            />
            <FeatureCard
              to="/applications"
              title="Application Tracker"
              description={
                loading
                  ? 'Track companies, roles, and pipeline status in one place.'
                  : stats.total === 0
                    ? 'No applications yet — start tracking your job search pipeline.'
                    : `Managing ${stats.total} application${stats.total === 1 ? '' : 's'} across your pipeline.`
              }
              icon={IconBriefcase}
              cta="Open tracker"
            />
          </div>
        </div>

        <aside className="dashboard-sidebar">
          <section className="panel">
            <header className="section-header">
              <h2>Recent activity</h2>
              {!loading && recentApplications.length > 0 && (
                <Link to="/applications" className="section-link">
                  View all
                </Link>
              )}
            </header>
            {loading ? (
              <ul className="recent-list">
                <ListItemSkeleton />
                <ListItemSkeleton />
                <ListItemSkeleton />
              </ul>
            ) : recentApplications.length === 0 ? (
              <div className="panel-empty">
                <p className="muted">No applications tracked yet.</p>
                <Link to="/applications" className="btn btn-ghost btn-sm">
                  Add your first role
                </Link>
              </div>
            ) : (
              <ul className="recent-list">
                {recentApplications.map((app) => (
                  <li key={app.id} className="recent-item">
                    <div className="recent-item-main">
                      <strong>{app.company}</strong>
                      <span className="muted small">{app.role}</span>
                    </div>
                    <div className="recent-item-meta">
                      <StatusBadge status={app.status} />
                      <time className="muted small" dateTime={app.updatedAt}>
                        {formatRelativeDate(app.updatedAt)}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel panel-workflow">
            <header className="section-header">
              <h2>Recommended workflow</h2>
            </header>
            <ol className="workflow-list">
              {WORKFLOW_STEPS.map((item) => (
                <li key={item.step}>
                  <span className="workflow-step">{item.step}</span>
                  <div>
                    <Link to={item.to} className="workflow-title">
                      {item.title}
                    </Link>
                    <p className="muted small">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: ComponentType<{ className?: string }>
  accent?: 'accent' | 'success' | 'warning'
}) {
  return (
    <article className={`stat-card ${accent ? `stat-card-${accent}` : ''}`}>
      <div className="stat-card-icon">
        <Icon />
      </div>
      <div className="stat-card-body">
        <span className="stat-card-value">{value}</span>
        <span className="stat-card-label">{label}</span>
      </div>
    </article>
  )
}

function FeatureCard({
  to,
  title,
  description,
  icon: Icon,
  cta,
  highlight,
}: {
  to: string
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  cta: string
  highlight?: boolean
}) {
  return (
    <Link to={to} className={`feature-card ${highlight ? 'feature-card-highlight' : ''}`}>
      <div className="feature-card-icon">
        <Icon />
      </div>
      <div className="feature-card-content">
        <h3>{title}</h3>
        <p>{description}</p>
        <span className="feature-card-cta">
          {cta}
          <IconArrowRight className="cta-icon" />
        </span>
      </div>
    </Link>
  )
}
