import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../services/AuthApi'

const AuthContext = createContext(null)

// Keeps the logged-in user available to every page
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    authApi.currentUser().then((found) => {
      setUser(found)
      setChecking(false)
    })
  }, [])

  async function signUp(details) {
    setUser(await authApi.signUp(details))
  }

  async function logIn(details) {
    setUser(await authApi.logIn(details))
  }

  async function logOut() {
    await authApi.logOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, checking, signUp, logIn, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
