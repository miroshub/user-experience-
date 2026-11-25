import { api } from './ApiClient'

// L11 admin dashboard (FR-33 to FR-37, FR-43). The server checks each admin role's tabs too.
export class AdminApi {
  flags() {
    return api.get('/api/admin/flags')
  }

  dismissFlag(flagId) {
    return api.post(`/api/admin/flags/${flagId}/dismiss`)
  }

  // { reason, reviewId? }
  warn(userId, warning) {
    return api.post(`/api/admin/users/${userId}/warnings`, warning)
  }

  suspend(userId) {
    return api.post(`/api/admin/users/${userId}/suspend`)
  }

  warnings() {
    return api.get('/api/admin/warnings')
  }

  markFixed(warningId) {
    return api.post(`/api/admin/warnings/${warningId}/fixed`)
  }

  users(text = '') {
    return api.get(`/api/admin/users?q=${encodeURIComponent(text)}`)
  }

  disputes() {
    return api.get('/api/admin/reviews')
  }

  // decision: 'keep' | 'remove'
  moderate(reviewId, decision) {
    return api.post(`/api/admin/reviews/${reviewId}`, { decision })
  }

  inbox() {
    return api.get('/api/admin/tickets')
  }

  reply(ticketId, text) {
    return api.post(`/api/admin/tickets/${ticketId}/reply`, { text })
  }

  close(ticketId) {
    return api.post(`/api/admin/tickets/${ticketId}/close`)
  }
}

export const adminApi = new AdminApi()
