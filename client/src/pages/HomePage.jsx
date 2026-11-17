import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { useAuth } from '../context/AuthContext'
import './HomePage.css'

// Placeholder for admins only. Seekers and companies go to /swipe; the admin dashboard comes in Phase 5.
export function HomePage() {
  const { user, logOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogOut() {
    await logOut()
    navigate('/')
  }

  const roleText = { seeker: 'Job seeker', company: 'Company', admin: 'Admin' }[user.role]

  return (
    <main className="home-page">
      <p className="home-page__logo">wuzzufny</p>
      <h1>Hi {user.fullName}</h1>
      <p className="home-page__meta">
        {roleText} · {user.email || user.phone} · {user.isVerified ? 'Verified' : 'Not verified yet'}
      </p>
      <p className="home-page__soon">Swiping arrives in the next phase.</p>
      <Button variant="secondary" onClick={handleLogOut}>
        Log out
      </Button>
    </main>
  )
}
