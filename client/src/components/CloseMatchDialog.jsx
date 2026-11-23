import { useState } from 'react'
import { Button } from './Button'
import { Chip } from './Chip'
import { Dialog } from './Dialog'
import { Icon } from './Icon'

// FR-29: no silent closing. Built from the H5 dialog parts (no Figma frame for this one).
const REASONS = {
  company: ['Position filled', 'Looking for more experience', 'Skills don’t match', 'Salary doesn’t fit'],
  seeker: ['Took another offer', 'Salary doesn’t fit', 'The role isn’t for me', 'No reply from the company'],
}
const OTHER = 'Other reason'

export function CloseMatchDialog({ side, otherName, jobTitle, onCancel, onSubmit }) {
  const [choice, setChoice] = useState('')
  const [ownWords, setOwnWords] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit() {
    const reason = choice === OTHER ? ownWords.trim() : choice
    if (!reason) {
      setError(choice === OTHER ? 'Write the reason in a few words' : 'Pick a reason')
      return
    }
    setSending(true)
    setError('')
    try {
      await onSubmit(reason)
    } catch (submitError) {
      setError(submitError.message)
      setSending(false)
    }
  }

  return (
    <Dialog
      title={side === 'seeker' ? 'Not interested anymore' : 'Close this match'}
      subtitle={`with ${otherName} · ${jobTitle}`}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" className="dialog__cancel" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="dialog__submit" onClick={handleSubmit} disabled={sending}>
            Close match
          </Button>
        </>
      }
    >
      <div className="dialog__group" role="radiogroup" aria-labelledby="reason-label">
        <p className="overline" id="reason-label">
          Reason
        </p>
        <div className="chip-row">
          {[...REASONS[side], OTHER].map((reason) => (
            <Chip
              key={reason}
              role="radio"
              aria-checked={reason === choice}
              state={reason === choice ? 'selected' : 'default'}
              onClick={() => setChoice(reason)}
            >
              {reason}
            </Chip>
          ))}
        </div>
      </div>
      {choice === OTHER && (
        <div className="dialog__field">
          <label className="dialog__label" htmlFor="close-reason">
            Your reason
          </label>
          <textarea
            id="close-reason"
            className="dialog__textarea"
            maxLength={200}
            value={ownWords}
            onChange={(event) => setOwnWords(event.target.value)}
          />
        </div>
      )}
      <p className="dialog__note">
        <Icon name="bell-small" />
        {otherName} will see this reason in the chat.
      </p>
      {error && (
        <p className="dialog__error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  )
}
