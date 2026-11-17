import { api } from './ApiClient'

// Drops empty filters so the URL only carries what the user picked
function toQuery(params) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  }
  return query.toString()
}

// The swipe feeds, the swipe itself, undo and the match list (FR-12 to FR-18)
export class SwipeApi {
  // filters: { role, city, workMode, minSalary }
  jobCards(filters = {}, limit = 5) {
    return api.get(`/api/feed/jobs?${toQuery({ ...filters, limit })}`)
  }

  // Answers { job, candidates, checkLater }
  candidates(jobId, limit = 20) {
    return api.get(`/api/feed/candidates?${toQuery({ jobId, limit })}`)
  }

  // A seeker sends { jobId, interested }; a company also sends seekerId
  swipe(body) {
    return api.post('/api/swipes', body)
  }

  undo() {
    return api.post('/api/swipes/undo')
  }

  matches() {
    return api.get('/api/matches')
  }
}

export const swipeApi = new SwipeApi()
