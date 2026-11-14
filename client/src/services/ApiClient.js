const TOKEN_KEY = 'wuzzufny.token'

// One place that talks to the Express API. It adds the login token and turns errors into messages.
export class ApiClient {
  getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  }

  setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      // private browsing can block storage; the user just has to log in again next time
    }
  }

  async request(method, url, body) {
    const headers = {}
    const token = this.getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    let response
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new Error('Cannot reach the server. Is it running?')
    }

    if (response.status === 204) return null
    const json = await response.json().catch(() => ({}))
    if (!response.ok) {
      const error = new Error(json.message || 'Something went wrong')
      error.status = response.status
      throw error
    }
    return json.data
  }

  get(url) {
    return this.request('GET', url)
  }

  post(url, body) {
    return this.request('POST', url, body)
  }

  patch(url, body) {
    return this.request('PATCH', url, body)
  }
}

export const api = new ApiClient()
