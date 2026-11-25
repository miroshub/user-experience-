import { useCallback, useEffect, useState } from 'react'
import { reviewApi } from '../services/ReviewApi'
import { Button } from './Button'
import { Chip } from './Chip'
import { ReviewDialog } from './ReviewDialog'
import { Stars } from './Stars'
import './ReviewBox.css'

const SERIOUS = ['Ghosted', 'No-show', 'Fake job / fake profile']

// One review: stars, tags (serious ones marked in words, not only colour), comment, reply
function ReviewView({ review, label, children }) {
  return (
    <div className="review">
      <p className="review__label">{label}</p>
      <Stars value={review.stars} />
      {review.tags.length > 0 && (
        <div className="chip-row">
          {review.tags.map((tag) => (
            <Chip key={tag} state={SERIOUS.includes(tag) ? 'missing' : 'default'}>
              {tag}
            </Chip>
          ))}
        </div>
      )}
      {review.comment && <p className="review__comment">“{review.comment}”</p>}
      {review.reply && (
        <p className="review__reply">
          <strong>Reply:</strong> {review.reply}
        </p>
      )}
      {review.status === 'disputed' && <p className="review__status">With the moderators. It doesn’t count until they decide.</p>}
      {children}
    </div>
  )
}

// FR-38 to FR-41 in the H4 "About this match" column
export function ReviewBox({ matchId, side, names, status }) {
  const [box, setBox] = useState(null)
  const [writing, setWriting] = useState(false)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [confirmDispute, setConfirmDispute] = useState(false)
  const [error, setError] = useState('')

  const otherName = side === 'seeker' ? names.company : names.seeker

  const load = useCallback(() => {
    reviewApi
      .forMatch(matchId)
      .then(setBox)
      .catch(() => setBox(null))
  }, [matchId])

  // the match closing or moving on can make a review possible, so reload then too
  useEffect(() => {
    load()
  }, [load, status])

  async function run(change) {
    setError('')
    try {
      await change()
      setReplying(false)
      setConfirmDispute(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function submit(review) {
    await reviewApi.submit(matchId, review)
    setWriting(false)
    load()
  }

  if (!box) return null
  const { canReview, mine, theirs, theyReviewed } = box
  if (!canReview && !mine && !theirs) {
    return (
      <section className="review-box" aria-label="Reviews">
        <p className="overline">Review</p>
        <p className="review-box__text">You can review {otherName} after an interview, or once the match is closed.</p>
      </section>
    )
  }

  return (
    <section className="review-box" aria-label="Reviews">
      <p className="overline">Reviews</p>

      {canReview && (
        <>
          <p className="review-box__text">
            {theyReviewed ? `${otherName} left you a review. Post yours to see it.` : `How did it go with ${otherName}?`}
          </p>
          <Button variant="secondary" fullWidth onClick={() => setWriting(true)}>
            Leave a review
          </Button>
        </>
      )}

      {mine && (
        <ReviewView review={mine} label="Your review">
          {mine.status === 'hidden' && (
            <p className="review__status">Hidden until {otherName} posts theirs, or for 14 days. No revenge reviews.</p>
          )}
        </ReviewView>
      )}

      {mine && !theirs && theyReviewed && <p className="review-box__text">{otherName} reviewed you too. It shows soon.</p>}

      {theirs && (
        <ReviewView review={theirs} label={`${otherName}’s review of you`}>
          {!theirs.reply && !replying && !confirmDispute && (
            <div className="review__actions">
              <Button variant="ghost" onClick={() => setReplying(true)}>
                Reply
              </Button>
              {theirs.status === 'visible' && (
                <Button variant="ghost" onClick={() => setConfirmDispute(true)}>
                  Dispute
                </Button>
              )}
            </div>
          )}
          {theirs.reply && theirs.status === 'visible' && !confirmDispute && (
            <Button variant="ghost" className="review__dispute" onClick={() => setConfirmDispute(true)}>
              Dispute this review
            </Button>
          )}
          {replying && (
            <div className="review__form">
              <label className="dialog__label" htmlFor="review-reply">
                Your public reply (once only)
              </label>
              <textarea
                id="review-reply"
                className="dialog__textarea"
                maxLength={300}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <div className="review__actions">
                <Button variant="secondary" onClick={() => setReplying(false)}>
                  Cancel
                </Button>
                <Button onClick={() => run(() => reviewApi.reply(theirs.id, replyText))}>Post reply</Button>
              </div>
            </div>
          )}
          {confirmDispute && (
            <div className="review__form">
              <p className="review-box__text">Send this review to the moderators? It stops counting until they decide.</p>
              <div className="review__actions">
                <Button variant="secondary" onClick={() => setConfirmDispute(false)}>
                  Cancel
                </Button>
                <Button onClick={() => run(() => reviewApi.dispute(theirs.id))}>Send to moderators</Button>
              </div>
            </div>
          )}
        </ReviewView>
      )}

      {error && (
        <p className="dialog__error" role="alert">
          {error}
        </p>
      )}

      {writing && (
        <ReviewDialog otherName={otherName} jobTitle={names.job} onCancel={() => setWriting(false)} onSubmit={submit} />
      )}
    </section>
  )
}
