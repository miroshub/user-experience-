import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { Button } from '../components/Button'
import { useAuth } from '../context/AuthContext'
import '../pages/SwipePage.css'

// Stands in for screens from later phases, so the sidebar links already go somewhere
export function ComingSoonPage({ title, phase }) {
  const { logOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogOut() {
    await logOut()
    navigate('/')
  }

  return (
    <AppLayout>
      <div className="empty-state">
        <h1 className="swipe-card__empty-title">{title}</h1>
        <p className="panel__text">This screen arrives in Phase {phase}.</p>
        <Button variant="secondary" onClick={handleLogOut}>
          Log out
        </Button>
      </div>
    </AppLayout>
  )
}
