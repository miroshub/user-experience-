import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import './AuthPages.css'

// Log in (FR-02). No Figma frame: H1's layout with fields, option (b) agreed with the student.
export function LoginPage() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const { logIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSending(true)
    try {
      await logIn({ login, password })
      navigate('/home')
    } catch (err) {
      setError(err.message)
      setSending(false)
    }
  }

  return (
    <AuthLayout>
      <form className="auth-page" onSubmit={handleSubmit}>
        <div className="auth-page__intro auth-page__intro--form">
          <h1 className="auth-page__heading">Welcome back</h1>
          <p className="auth-page__lead">Log in to see your matches and messages.</p>
        </div>

        {error && (
          <p className="auth-page__error" role="alert">
            {error}
          </p>
        )}

        <div className="auth-page__fields">
          <TextField
            label="Email or phone number"
            autoComplete="username"
            required
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="auth-page__spacer" />

        <Button type="submit" size="lg" fullWidth disabled={sending}>
          {sending ? 'Logging in…' : 'Log in'}
        </Button>
        <p className="auth-page__switch">
          New here? <Link to="/">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
