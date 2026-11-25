import { api } from './ApiClient'

// H8 Profile + Trust centre (FR-05 to FR-07)
export class TrustApi {
  // { user, health, openWarning, warnings, tickets, replyPromise }
  overview() {
    return api.get('/api/trust')
  }

  // FR-06: { topic, message }
  contactSupport(ticket) {
    return api.post('/api/trust/tickets', ticket)
  }

  updateProfile(changes) {
    return api.patch('/api/users/me', changes)
  }

  // FR-05: how many of each kind of record is stored
  dataSummary() {
    return api.get('/api/me/data')
  }

  // FR-05: everything as one JSON file (a Blob, because the request needs the login token)
  downloadData() {
    return api.getFile('/api/me/data/download')
  }

  // FR-05: the password is asked again before anything is deleted
  deleteAccount(password) {
    return api.delete('/api/me', { password })
  }
}

// The topics the server accepts (SupportTicket.TOPICS)
export const SUPPORT_TOPICS = ['Account', 'Verification', 'A match or chat', 'A review', 'A warning', 'Something else']

export const trustApi = new TrustApi()
