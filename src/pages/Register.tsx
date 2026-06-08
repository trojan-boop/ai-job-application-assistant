import { Navigate } from 'react-router-dom'
import { AuthForm } from '../components/AuthForm'
import { useAuth } from '../context/AuthContext'

export function Register() {
  const { user, register } = useAuth()

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="auth-page">
      <AuthForm
        mode="register"
        onSubmit={async ({ name, email, password }) => {
          if (!name?.trim()) throw new Error('Name is required.')
          await register(name, email, password)
        }}
      />
    </div>
  )
}
