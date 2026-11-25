import { useState } from 'react'
import { displayName } from '../../services/format'
import { Button } from '../Button'
import { Dialog } from '../Dialog'
import { Icon } from '../Icon'

const ROLE_TEXT = { seeker: 'Job seeker', company: 'Company' }

// "Salma Ali · Job seeker · salma@x.co", the same in every table
export function UserCell({ user }) {
  if (!user) return <span className="admin-user__sub">Deleted account</span>
  return (
    <span className="admin-user">
      <span className="admin-user__name">
        {displayName(user)}
        {user.isVerified && (
          <>
            <Icon name="shield-small" />
            <span className="visually-hidden"> (verified)</span>
          </>
        )}
      </span>
      <span className="admin-user__sub">
        {[ROLE_TEXT[user.role], user.email || user.phone].filter(Boolean).join(' · ')}
        {user.accountState === 'suspended' && ' · Suspended'}
      </span>
    </span>
  )
}

// Loading, error and "done" lines above each table
export function TabStatus({ items, error, notice, empty }) {
  return (
    <>
      <div className="notice-area" aria-live="polite">
        {notice && <p className="notice">{notice}</p>}
      </div>
      {error && (
        <p className="profile-page__error" role="alert">
          {error}
        </p>
      )}
      {!items && !error && <p className="profile-page__loading">Loading…</p>}
      {items && items.length === 0 && <p className="admin-empty">{empty}</p>}
    </>
  )
}

// FR-35 / FR-43: the reason is required; the 7 days are added by the server
export function WarningDialog({ user, review, onCancel, onSubmit }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit() {
    if (!reason.trim()) return setError('Write the reason')
    setSending(true)
    setError('')
    try {
      await onSubmit({ reason: reason.trim(), ...(review ? { reviewId: review.id } : {}) })
    } catch (err) {
      setError(err.message)
      setSending(false)
    }
  }

  return (
    <Dialog
      title="Send a warning"
      subtitle={`to ${displayName(user)}${review ? ' · linked to the review as evidence' : ''}`}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" className="dialog__cancel" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="dialog__submit" onClick={handleSubmit} disabled={sending}>
            Send warning
          </Button>
        </>
      }
    >
      <div className="dialog__field">
        <label className="dialog__label" htmlFor="warning-reason">
          Reason (they will see this)
        </label>
        <textarea
          id="warning-reason"
          className="dialog__textarea"
          maxLength={300}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      <p className="dialog__note">
        <Icon name="bell-small" />
        They get 7 days to fix it. Suspend only unlocks after that date.
      </p>
      {error && (
        <p className="dialog__error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  )
}
