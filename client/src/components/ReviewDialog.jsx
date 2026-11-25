import { useState } from 'react'
import { Button } from './Button'
import { Chip } from './Chip'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { StarPicker } from './Stars'
import { REVIEW_TAGS } from '../services/ReviewApi'

const STAR_WORDS = ['', 'Very bad', 'Bad', 'OK', 'Good', 'Great']

// FR-38: 1–5 stars, optional tags, a comment of up to 300 characters.
// No Figma frame: built from the H5 dialog parts, like Close match.
export function ReviewDialog({ otherName, jobTitle, onCancel, onSubmit }) {
  const [stars, setStars] = useState(0)
  const [tags, setTags] = useState([])
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  function toggleTag(tag) {
    setTags(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag])
  }

  async function handleSubmit() {
    if (!stars) return setError('Pick 1 to 5 stars')
    setSending(true)
    setError('')
    try {
      await onSubmit({ stars, tags, comment: comment.trim() })
    } catch (submitError) {
      setError(submitError.message)
      setSending(false)
    }
  }

  return (
    <Dialog
      title={`Review ${otherName}`}
      subtitle={jobTitle}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" className="dialog__cancel" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="dialog__submit" onClick={handleSubmit} disabled={sending}>
            Post review
          </Button>
        </>
      }
    >
      <div className="dialog__group">
        <p className="overline" id="stars-label">
          How was it?{stars > 0 && ` · ${STAR_WORDS[stars]}`}
        </p>
        <StarPicker value={stars} onChange={setStars} />
      </div>
      <div className="dialog__group">
        <p className="overline" id="tags-label">
          Anything that went wrong? (optional)
        </p>
        <div className="chip-row" role="group" aria-labelledby="tags-label">
          {REVIEW_TAGS.map((tag) => (
            <Chip
              key={tag}
              aria-pressed={tags.includes(tag)}
              state={tags.includes(tag) ? 'selected' : 'default'}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Chip>
          ))}
        </div>
      </div>
      <div className="dialog__field">
        <label className="dialog__label" htmlFor="review-comment">
          Comment (optional, {300 - comment.length} characters left)
        </label>
        <textarea
          id="review-comment"
          className="dialog__textarea"
          maxLength={300}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>
      <p className="dialog__note">
        <Icon name="bell-small" />
        {otherName} sees your review once they post theirs, or after 14 days. You can’t change it later.
      </p>
      {error && (
        <p className="dialog__error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  )
}
