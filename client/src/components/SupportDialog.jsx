import { useState } from 'react'
import { Button } from './Button'
import { Chip } from './Chip'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { SUPPORT_TOPICS } from '../services/TrustApi'

// FR-06 "Talk to support". No Figma frame: built from the H5 dialog parts, like Close match.
export function SupportDialog({ replyPromise, onCancel, onSubmit }) {
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit() {
    if (!topic) return setError('Pick a topic')
    if (!message.trim()) return setError('Write your message')
    setSending(true)
    setError('')
    try {
      await onSubmit({ topic, message: message.trim() })
    } catch (submitError) {
      setError(submitError.message)
      setSending(false)
    }
  }

  return (
    <Dialog
      title="Talk to support"
      subtitle={replyPromise}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" className="dialog__cancel" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="dialog__submit" onClick={handleSubmit} disabled={sending}>
            Send
          </Button>
        </>
      }
    >
      <div className="dialog__group" role="radiogroup" aria-labelledby="topic-label">
        <p className="overline" id="topic-label">
          Topic
        </p>
        <div className="chip-row">
          {SUPPORT_TOPICS.map((item) => (
            <Chip
              key={item}
              role="radio"
              aria-checked={item === topic}
              state={item === topic ? 'selected' : 'default'}
              onClick={() => setTopic(item)}
            >
              {item}
            </Chip>
          ))}
        </div>
      </div>
      <div className="dialog__field">
        <label className="dialog__label" htmlFor="support-message">
          Your message
        </label>
        <textarea
          id="support-message"
          className="dialog__textarea"
          maxLength={1000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </div>
      <p className="dialog__note">
        <Icon name="bell-small" />
        The reply shows up here in your Trust centre.
      </p>
      {error && (
        <p className="dialog__error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  )
}
