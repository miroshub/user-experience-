import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { WelcomePage } from './pages/WelcomePage'
import { SignUpPage } from './pages/SignUpPage'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'

// Logged-in users skip the welcome pages; logged-out users cannot open /home
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<OnlyLoggedOut><WelcomePage /></OnlyLoggedOut>} />
          <Route path="/signup" element={<OnlyLoggedOut><SignUpPage /></OnlyLoggedOut>} />
          <Route path="/login" element={<OnlyLoggedOut><LoginPage /></OnlyLoggedOut>} />
          <Route path="/home" element={<OnlyLoggedIn><HomePage /></OnlyLoggedIn>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
