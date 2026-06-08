import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

type AuthFormProps = {
  mode: 'login' | 'register'
  onSubmit: (data: {
    name?: string
    email: string
    password: string
  }) => Promise<void>
}

export function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onSubmit({
        name: mode === 'register' ? name : undefined,
        email,
        password,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-card">
      <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
      <p className="muted">
        {mode === 'login'
          ? 'Welcome back. Continue to your job search dashboard.'
          : 'Get started with resume analysis in minutes.'}
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        {mode === 'register' && (
          <label>
            Full name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'register' ? 6 : undefined}
            required
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting
            ? 'Please wait…'
            : mode === 'login'
              ? 'Sign in'
              : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">
        {mode === 'login' ? (
          <>
            No account? <Link to="/register">Register</Link>
          </>
        ) : (
          <>
            Already have an account? <Link to="/login">Sign in</Link>
          </>
        )}
      </p>
    </div>
  )
}
