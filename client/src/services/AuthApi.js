import { api } from './ApiClient'

// The sign-up form has one "Email or phone" box; the API wants one or the other
function splitLogin(value) {
  const text = value.trim()
  return text.includes('@') ? { email: text } : { phone: text.replace(/[\s-]/g, '') }
}

export class AuthApi {
  async signUp({ role, fullName, login, password, companyName }) {
    const body = { role, fullName, password, ...splitLogin(login) }
    if (role === 'company' && companyName) body.companyName = companyName
    const data = await api.post('/api/auth/signup', body)
    api.setToken(data.token)
    return data.user
  }

  async logIn({ login, password }) {
    const data = await api.post('/api/auth/login', { login: login.trim(), password })
    api.setToken(data.token)
    return data.user
  }

  async logOut() {
    try {
      await api.post('/api/auth/logout')
    } finally {
      api.setToken(null)
    }
  }

  forgetToken() {
    api.setToken(null)
  }

  // Returns the logged-in user, or null when there is no valid token
  async currentUser() {
    if (!api.getToken()) return null
    try {
      return await api.get('/api/users/me')
    } catch (error) {
      if (error.status === 401 || error.status === 403) api.setToken(null)
      return null
    }
  }
}

export const authApi = new AuthApi()
