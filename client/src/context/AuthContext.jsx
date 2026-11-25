import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../services/AuthApi'
import { liveSocket } from '../services/LiveSocket'

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
    liveSocket.disconnect()
    setUser(await authApi.signUp(details))
  }

  async function logIn(details) {
    liveSocket.disconnect()
    setUser(await authApi.logIn(details))
  }

  async function logOut() {
    await authApi.logOut()
    // the live socket belongs to the old login; the next user gets a fresh one
    liveSocket.disconnect()
    setUser(null)
  }

  // After the profile changes on the server, so the sidebar shows the new name straight away
  function replaceUser(updated) {
    setUser(updated)
  }

  // After "Delete my account": the token is useless now, so forget it without calling the server
  function forget() {
    authApi.forgetToken()
    liveSocket.disconnect()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, checking, signUp, logIn, logOut, replaceUser, forget }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
