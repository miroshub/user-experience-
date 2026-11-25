import { useCallback } from 'react'
import { adminApi } from '../../services/AdminApi'
import { dayText } from '../../services/format'
import { Button } from '../Button'
import { TabStatus, UserCell } from './AdminParts'
import { useAdminData } from './useAdminData'

const STATUS_TEXT = { open: 'Open', expired: 'Past fix-by date', fixed: 'Fixed' }

// Every warning sent, newest first. Suspend is here too, for accounts that are not flagged.
export function WarningsTab() {
  const loader = useCallback(() => adminApi.warnings(), [])
  const { items, error, notice, busy, run } = useAdminData(loader)

  return (
    <>
      <TabStatus items={items} error={error} notice={notice} empty="No warnings sent yet." />
      {items && items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <caption className="visually-hidden">Warnings, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col">Reason</th>
                <th scope="col">Status</th>
                <th scope="col">Fix by</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.id}>
                  <td>
                    <UserCell user={w.user} />
                  </td>
                  <td>
                    {w.reason}
                    {w.reviewId && <span className="admin-user__sub">Linked to a review</span>}
                  </td>
                  <td>
                    <span className={`admin-status admin-status--${w.status}`}>{STATUS_TEXT[w.status]}</span>
                  </td>
                  <td>{dayText(w.deadline)}</td>
                  <td>
                    <span className="admin-actions">
                      {w.status !== 'fixed' && (
                        <Button variant="secondary" onClick={() => run(() => adminApi.markFixed(w.id), 'Marked as fixed')} disabled={busy}>
                          Mark fixed
                        </Button>
                      )}
                      {w.status === 'expired' && w.user?.accountState === 'active' && (
                        <Button variant="secondary" onClick={() => run(() => adminApi.suspend(w.user.id), `${w.user.fullName} is suspended`)} disabled={busy}>
                          Suspend
                        </Button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
