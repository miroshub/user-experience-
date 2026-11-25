import { api } from './ApiClient'

// FR-38 to FR-41: reviews after a match
export class ReviewApi {
  // { canReview, mine, theirs, theyReviewed }
  forMatch(matchId) {
    return api.get(`/api/matches/${matchId}/reviews`)
  }

  // { stars, tags, comment }
  submit(matchId, review) {
    return api.post(`/api/matches/${matchId}/reviews`, review)
  }

  reply(reviewId, text) {
    return api.post(`/api/reviews/${reviewId}/reply`, { text })
  }

  dispute(reviewId) {
    return api.post(`/api/reviews/${reviewId}/dispute`)
  }
}

// The tags the server accepts (Review.TAGS). The first three are "serious" (FR-42).
export const REVIEW_TAGS = ['Ghosted', 'No-show', 'Fake job / fake profile', 'Rude']

export const reviewApi = new ReviewApi()
