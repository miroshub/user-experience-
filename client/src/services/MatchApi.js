import { api } from './ApiClient'

// H4 and H5: matches, chat, interviews and tests (FR-22 to FR-29). The only file that knows these URLs.
export class MatchApi {
  list() {
    return api.get('/api/matches')
  }

  get(matchId) {
    return api.get(`/api/matches/${matchId}`)
  }

  messages(matchId) {
    return api.get(`/api/matches/${matchId}/messages`)
  }

  send(matchId, text) {
    return api.post(`/api/matches/${matchId}/messages`, { text })
  }

  // Answers { link } for the match's Jitsi room
  startCall(matchId) {
    return api.post(`/api/matches/${matchId}/call`)
  }

  // Free interview times, as ISO strings
  slots(matchId) {
    return api.get(`/api/matches/${matchId}/slots`)
  }

  // { type: 'video' | 'in person', dateTime, note }
  book(matchId, details) {
    return api.post(`/api/matches/${matchId}/interviews`, details)
  }

  accept(interviewId) {
    return api.post(`/api/interviews/${interviewId}/accept`)
  }

  askNewTime(interviewId, dateTime) {
    return api.post(`/api/interviews/${interviewId}/new-time`, { dateTime })
  }

  reschedule(interviewId, dateTime) {
    return api.post(`/api/interviews/${interviewId}/reschedule`, { dateTime })
  }

  // status: 'offer' | 'hired'
  moveStatus(matchId, status) {
    return api.post(`/api/matches/${matchId}/status`, { status })
  }

  close(matchId, reason) {
    return api.post(`/api/matches/${matchId}/close`, { reason })
  }
}

export const matchApi = new MatchApi()
