import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import './AuthPages.css'

// Sign up (FR-01). No Figma frame: H1's layout with fields, option (b) agreed with the student.
export function SignUpPage() {
  const [params] = useSearchParams()
  const role = params.get('role') === 'company' ? 'company' : 'seeker'
  const isCompany = role === 'company'

  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSending(true)
    try {
      await signUp({ role, fullName, companyName, login, password })
      navigate('/home')
    } catch (err) {
      setError(err.message)
      setSending(false)
    }
  }

  return (
    <AuthLayout>
      <form className="auth-page" onSubmit={handleSubmit}>
        <Link className="auth-page__back" to="/">
          ← Change what I’m here to do
        </Link>
        <div className="auth-page__intro auth-page__intro--form">
          <h1 className="auth-page__heading">{isCompany ? 'Start hiring' : 'Start finding jobs'}</h1>
          <p className="auth-page__lead">
            {isCompany
              ? 'Create a company account. You can add your logo and details later.'
              : 'Create your account. You can browse jobs before adding a CV.'}
          </p>
        </div>

        {error && (
          <p className="auth-page__error" role="alert">
            {error}
          </p>
        )}

        <div className="auth-page__fields">
          <TextField
            label="Full name"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          {isCompany && (
            <TextField
              label="Company name"
              autoComplete="organization"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          )}
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
            autoComplete="new-password"
            hint="At least 8 characters"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="auth-page__spacer" />

        <Button type="submit" size="lg" fullWidth disabled={sending}>
          {sending ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="auth-page__switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
