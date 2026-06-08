import { Navigate } from 'react-router-dom'
import { AuthForm } from '../components/AuthForm'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const { user, login } = useAuth()

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="auth-page">
      <AuthForm
        mode="login"
        onSubmit={async ({ email, password }) => {
          await login(email, password)
        }}
      />
    </div>
  )
}
