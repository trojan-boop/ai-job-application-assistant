import { useEffect, useState, type ComponentType } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  IconBriefcase,
  IconChart,
  IconClose,
  IconHome,
  IconMail,
  IconMenu,
} from './icons'
import { getInitials } from '../lib/format'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS: {
  to: string
  label: string
  end?: boolean
  icon: ComponentType<{ className?: string }>
}[] = [
  { to: '/dashboard', label: 'Dashboard', end: true, icon: IconHome },
  { to: '/analyzer', label: 'Analyzer', icon: IconChart },
  { to: '/cover-letter', label: 'Cover Letter', icon: IconMail },
  { to: '/applications', label: 'Applications', icon: IconBriefcase },
]

export function Layout() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/dashboard" className="brand" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark" aria-hidden>
              JA
            </span>
            <span className="brand-text">
              <span className="brand-title">JobApply</span>
              <span className="brand-sub muted small">AI Assistant</span>
            </span>
          </Link>

          <button
            type="button"
            className="nav-toggle btn btn-ghost"
            aria-expanded={menuOpen}
            aria-controls="primary-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>

          <nav
            id="primary-nav"
            className={`app-nav ${menuOpen ? 'app-nav-open' : ''}`}
            aria-label="Primary"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon className="nav-link-icon" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className="header-actions">
            <div className="user-chip" title={user?.email}>
              <span className="user-avatar" aria-hidden>
                {getInitials(user?.name ?? 'U')}
              </span>
              <div className="user-meta">
                <span className="user-label">{user?.name}</span>
                <span className="user-email muted small">{user?.email}</span>
              </div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>

        {menuOpen && (
          <button
            type="button"
            className="nav-backdrop"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
        )}
      </header>

      <main id="main-content" className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <p className="muted small">
          AI Job Application Assistant — resume analysis, cover letters, and application tracking.
        </p>
      </footer>
    </div>
  )
}
