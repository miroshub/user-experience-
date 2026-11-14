import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { RoleOption } from '../components/RoleOption'
import searchIcon from '../assets/icons/search.svg'
import jobsIcon from '../assets/icons/jobs.svg'
import shieldIcon from '../assets/icons/shield.svg'
import './AuthPages.css'

// H1 · Welcome (Figma node 6:5)
export function WelcomePage() {
  const [role, setRole] = useState('seeker')
  const navigate = useNavigate()

  function handleContinue(event) {
    event.preventDefault()
    navigate(`/signup?role=${role}`)
  }

  return (
    <AuthLayout>
      <form className="auth-page" onSubmit={handleContinue}>
        <div className="auth-page__intro auth-page__intro--welcome">
          <h1 className="auth-page__display">Jobs that answer back.</h1>
          <p className="auth-page__lead">
            Swipe on jobs. Companies swipe on you. When you both say yes, a chat opens straight away. No more
            applying into silence.
          </p>
        </div>

        <fieldset className="auth-page__roles">
          <legend className="auth-page__overline">I’M HERE TO…</legend>
          <RoleOption
            value="seeker"
            title="Find a job"
            description="Swipe on jobs that fit your CV"
            icon={searchIcon}
            checked={role === 'seeker'}
            onChange={setRole}
          />
          <RoleOption
            value="company"
            title="Hire someone"
            description="Swipe on people who fit your job"
            icon={jobsIcon}
            checked={role === 'company'}
            onChange={setRole}
          />
        </fieldset>

        <div className="auth-page__spacer" />

        <p className="auth-page__note">
          <img src={shieldIcon} alt="" />
          Look around first. We only ask for ID once, when you say you’re interested.
        </p>
        <Button type="submit" size="lg" fullWidth>
          Continue
        </Button>
        <p className="auth-page__switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
