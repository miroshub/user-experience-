import { useCallback, useState } from 'react'
import { adminApi } from '../../services/AdminApi'
import { Button } from '../Button'
import { TabStatus, UserCell } from './AdminParts'
import { useAdminData } from './useAdminData'

function waitingText(hours) {
  if (hours < 1) return 'Waiting under 1 hour'
  if (hours < 48) return `Waiting ${hours} h`
  return `Waiting ${Math.floor(hours / 24)} days`
}

// FR-37: the shared support inbox, the longest wait first. Over 24 hours is marked in words.
export function InboxTab() {
  const loader = useCallback(() => adminApi.inbox(), [])
  const { items, error, notice, busy, run } = useAdminData(loader)
  const [drafts, setDrafts] = useState({})

  return (
    <>
      <TabStatus items={items} error={error} notice={notice} empty="Inbox zero. No open tickets." />
      {items && items.length > 0 && (
        <ul className="admin-cards">
          {items.map((ticket) => {
            const late = ticket.hoursWaiting >= 24
            return (
              <li key={ticket.id} className="trust-card admin-card">
                <div className="admin-card__people">
                  <UserCell user={ticket.user} />
                  <span className={`admin-status${late ? ' admin-status--expired' : ' admin-status--open'}`}>
                    {waitingText(ticket.hoursWaiting)}
                    {late && ' · over 24 h promise'}
                  </span>
                </div>
                <p className="trust-row__title">{ticket.topic}</p>
                <p className="review__comment">{ticket.message}</p>
                {ticket.reply && (
                  <p className="review__reply">
                    <strong>Your reply:</strong> {ticket.reply}
                  </p>
                )}
                <label className="dialog__label" htmlFor={`reply-${ticket.id}`}>
                  {ticket.reply ? 'Change the reply' : 'Reply'}
                </label>
                <textarea
                  id={`reply-${ticket.id}`}
                  className="dialog__textarea"
                  maxLength={1000}
                  value={drafts[ticket.id] || ''}
                  onChange={(e) => setDrafts({ ...drafts, [ticket.id]: e.target.value })}
                />
                <div className="admin-actions">
                  <Button
                    disabled={busy || !(drafts[ticket.id] || '').trim()}
                    onClick={() =>
                      run(async () => {
                        await adminApi.reply(ticket.id, drafts[ticket.id])
                        setDrafts({ ...drafts, [ticket.id]: '' })
                      }, 'Reply sent. It shows in their Trust centre.')
                    }
                  >
                    Send reply
                  </Button>
                  <Button variant="secondary" onClick={() => run(() => adminApi.close(ticket.id), 'Ticket closed')} disabled={busy}>
                    Close ticket
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
