import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { Button } from '../components/Button'
import { FlagsTab } from '../components/admin/FlagsTab'
import { InboxTab } from '../components/admin/InboxTab'
import { ReviewsTab } from '../components/admin/ReviewsTab'
import { UsersTab } from '../components/admin/UsersTab'
import { WarningsTab } from '../components/admin/WarningsTab'
import { SegmentedControl } from '../components/SegmentedControl'
import { useAuth } from '../context/AuthContext'
import './ProfilePage.css'
import './AdminPage.css'

// One entry per tab. A new tab is one more line here (Open/Closed); the server decides who sees it.
const TABS = {
  flags: { label: 'Spam flags', title: 'Flagged accounts', Tab: FlagsTab },
  reviews: { label: 'Disputed reviews', title: 'Disputed reviews', Tab: ReviewsTab },
  warnings: { label: 'Warnings', title: 'Warnings', Tab: WarningsTab },
  users: { label: 'Users', title: 'Users', Tab: UsersTab },
  inbox: { label: 'Support', title: 'Support inbox', Tab: InboxTab },
}

const ROLE_TEXT = { moderator: 'Moderator', support: 'Support' }

// L11 admin dashboard (FR-33): a top menu with only this admin role's tabs, and Log out.
// No Figma frame: built from the H8 cards, the H9 segmented control and the H5 dialogs.
export function AdminPage() {
  const { user, logOut } = useAuth()
  const { tab } = useParams()
  const navigate = useNavigate()
  const tabs = (user.tabs || []).filter((key) => TABS[key])

  if (!tab || !tabs.includes(tab)) return <Navigate to={`/admin/${tabs[0]}`} replace />
  const { title, Tab } = TABS[tab]

  async function handleLogOut() {
    await logOut()
    navigate('/')
  }

  return (
    <AppLayout>
      <div className="profile-page admin-page">
        <header className="admin-page__head">
          <div className="admin-page__titles">
            <p className="overline">Admin · {ROLE_TEXT[user.adminRole]}</p>
            <h1 className="profile-head__name">{title}</h1>
          </div>
          <Button variant="ghost" className="admin-page__logout" onClick={handleLogOut}>
            Log out
          </Button>
        </header>
        {tabs.length > 1 && (
          <SegmentedControl
            label="Admin sections"
            options={tabs.map((key) => ({ value: key, label: TABS[key].label }))}
            value={tab}
            onChange={(next) => navigate(`/admin/${next}`)}
          />
        )}
        <Tab key={tab} />
      </div>
    </AppLayout>
  )
}
