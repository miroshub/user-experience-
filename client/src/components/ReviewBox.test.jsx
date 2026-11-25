import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReviewBox } from './ReviewBox'
import { reviewApi } from '../services/ReviewApi'

vi.mock('../services/ReviewApi', async (original) => ({
  ...(await original()),
  reviewApi: { forMatch: vi.fn(), submit: vi.fn(), reply: vi.fn(), dispute: vi.fn() },
}))

const names = { company: 'Nile Tech', seeker: 'Salma Ali', job: 'Junior Frontend Developer' }
const theirReview = {
  id: 'r1', stars: 2, tags: ['Ghosted'], comment: 'No reply for weeks', reply: null, status: 'visible',
}

function box(changes) {
  return { canReview: false, mine: null, theirs: null, theyReviewed: false, ...changes }
}

function show(side = 'seeker') {
  render(<ReviewBox matchId="m1" side={side} names={names} status="closed" />)
}

describe('ReviewBox (FR-38 to FR-41)', () => {
  beforeEach(() => vi.resetAllMocks())

  it('says when a review becomes possible', async () => {
    reviewApi.forMatch.mockResolvedValue(box())
    show()
    expect(await screen.findByText('You can review Nile Tech after an interview, or once the match is closed.')).toBeInTheDocument()
  })

  it('posts a review with stars, tags and a comment (FR-38)', async () => {
    reviewApi.forMatch.mockResolvedValueOnce(box({ canReview: true }))
    reviewApi.forMatch.mockResolvedValue(box({ mine: { id: 'r2', stars: 4, tags: ['Rude'], comment: 'Late', status: 'hidden' } }))
    reviewApi.submit.mockResolvedValue({})
    show()
    await userEvent.click(await screen.findByRole('button', { name: 'Leave a review' }))
    const dialog = screen.getByRole('dialog', { name: 'Review Nile Tech' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'Post review' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Pick 1 to 5 stars')

    await userEvent.click(within(dialog).getByRole('radio', { name: '4 stars' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Rude' }))
    await userEvent.type(within(dialog).getByLabelText(/Comment/), 'Late')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Post review' }))

    expect(reviewApi.submit).toHaveBeenCalledWith('m1', { stars: 4, tags: ['Rude'], comment: 'Late' })
    expect(await screen.findByText(/Hidden until Nile Tech posts theirs/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '4 out of 5 stars' })).toBeInTheDocument()
  })

  it('keeps their review blind until I post mine (NFR-08)', async () => {
    reviewApi.forMatch.mockResolvedValue(box({ canReview: true, theyReviewed: true }))
    show()
    expect(await screen.findByText('Nile Tech left you a review. Post yours to see it.')).toBeInTheDocument()
  })

  it('replies once to a review about me (FR-40)', async () => {
    reviewApi.forMatch.mockResolvedValue(box({ theirs: theirReview }))
    reviewApi.reply.mockResolvedValue({})
    show('company')
    expect(await screen.findByText('“No reply for weeks”')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reply' }))
    await userEvent.type(screen.getByLabelText('Your public reply (once only)'), 'We emailed you')
    await userEvent.click(screen.getByRole('button', { name: 'Post reply' }))
    expect(reviewApi.reply).toHaveBeenCalledWith('r1', 'We emailed you')
  })

  it('disputes a review after a confirm step (FR-41)', async () => {
    reviewApi.forMatch.mockResolvedValue(box({ theirs: theirReview }))
    reviewApi.dispute.mockResolvedValue({})
    show('company')
    await userEvent.click(await screen.findByRole('button', { name: 'Dispute' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send to moderators' }))
    expect(reviewApi.dispute).toHaveBeenCalledWith('r1')
  })
})
