import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { WelcomePage } from './pages/WelcomePage'
import { SignUpPage } from './pages/SignUpPage'
import { LoginPage } from './pages/LoginPage'
import { SwipeJobsPage } from './pages/SwipeJobsPage'
import { CompanySwipePage } from './pages/CompanySwipePage'
import { EditJobPage } from './pages/EditJobPage'
import { JobsRedirect } from './pages/JobsRedirect'
import { MatchesPage } from './pages/MatchesPage'
import { MyCvPage } from './pages/MyCvPage'
import { AskPage } from './pages/AskPage'
import { ProfilePage } from './pages/ProfilePage'
import { DataPage } from './pages/DataPage'
import { AdminPage } from './pages/AdminPage'

// Logged-in users skip the welcome pages; logged-out users cannot open the app pages
function OnlyLoggedOut({ children }) {
  const { user, checking } = useAuth()
  if (checking) return null
  return user ? <Navigate to="/home" replace /> : children
}

function OnlyLoggedIn({ children }) {
  const { user, checking } = useAuth()
  if (checking) return null
  return user ? children : <Navigate to="/login" replace />
}

// Shows the page for the user's role: { seeker: <A />, company: <B /> }. Anyone else goes home.
function ByRole({ pages }) {
  const { user } = useAuth()
  return pages[user.role] || <Navigate to="/home" replace />
}

// Seekers and companies start on the swipe page; admins on their dashboard (FR-33)
function Home() {
  const { user } = useAuth()
  return <Navigate to={user.role === 'admin' ? '/admin' : '/swipe'} replace />
}

function loggedIn(element) {
  return <OnlyLoggedIn>{element}</OnlyLoggedIn>
}

const companyOnly = (page) => loggedIn(<ByRole pages={{ company: page }} />)
const seekerOnly = (page) => loggedIn(<ByRole pages={{ seeker: page }} />)
const memberOnly = (page) => loggedIn(<ByRole pages={{ seeker: page, company: page }} />)
const adminOnly = (page) => loggedIn(<ByRole pages={{ admin: page }} />)

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<OnlyLoggedOut><WelcomePage /></OnlyLoggedOut>} />
          <Route path="/signup" element={<OnlyLoggedOut><SignUpPage /></OnlyLoggedOut>} />
          <Route path="/login" element={<OnlyLoggedOut><LoginPage /></OnlyLoggedOut>} />
          <Route path="/home" element={loggedIn(<Home />)} />
          <Route
            path="/swipe"
            element={loggedIn(<ByRole pages={{ seeker: <SwipeJobsPage />, company: <CompanySwipePage /> }} />)}
          />
          <Route path="/swipe/ask" element={seekerOnly(<AskPage />)} />
          <Route path="/jobs" element={companyOnly(<JobsRedirect />)} />
          <Route path="/jobs/new" element={companyOnly(<EditJobPage />)} />
          <Route path="/jobs/:id/edit" element={companyOnly(<EditJobPage />)} />
          <Route path="/matches" element={loggedIn(<ByRole pages={{ seeker: <MatchesPage />, company: <MatchesPage /> }} />)} />
          <Route path="/matches/:id" element={loggedIn(<ByRole pages={{ seeker: <MatchesPage />, company: <MatchesPage /> }} />)} />
          <Route path="/cv" element={seekerOnly(<MyCvPage />)} />
          <Route path="/profile" element={memberOnly(<ProfilePage />)} />
          <Route path="/profile/data" element={memberOnly(<DataPage />)} />
          <Route path="/admin" element={adminOnly(<AdminPage />)} />
          <Route path="/admin/:tab" element={adminOnly(<AdminPage />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
