import { useCallback, useState } from 'react'
import { adminApi } from '../../services/AdminApi'
import { dayText } from '../../services/format'
import { Button } from '../Button'
import { Chip } from '../Chip'
import { TabStatus, UserCell, WarningDialog } from './AdminParts'
import { useAdminData } from './useAdminData'

const SOURCE_TEXT = { spam: 'Spam check', review: 'Reviews' }
const STATUS_TEXT = { open: 'open', expired: 'past its fix-by date', fixed: 'fixed' }

// The newest warning, in words, so the moderator knows why Suspend is on or off
function warningLine(warnings) {
  if (warnings.length === 0) return 'No warning yet'
  const w = warnings[0]
  return `Warning ${STATUS_TEXT[w.status]} · fix by ${dayText(w.deadline)}`
}

// FR-34 to FR-36: flagged accounts, why, how many rules were hit
export function FlagsTab() {
  const loader = useCallback(() => adminApi.flags(), [])
  const { items, error, notice, busy, run } = useAdminData(loader)
  const [warning, setWarning] = useState(null)

  return (
    <>
      <TabStatus items={items} error={error} notice={notice} empty="No flagged accounts. Nice and quiet." />
      {items && items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <caption className="visually-hidden">Flagged accounts, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col">Why</th>
                <th scope="col">Rules hit</th>
                <th scope="col">Raised</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((flag) => (
                <tr key={flag.id}>
                  <td>
                    <UserCell user={flag.user} />
                    <span className="admin-user__sub">{warningLine(flag.warnings)}</span>
                  </td>
                  <td>
                    <span className="admin-why">
                      <span className="admin-tag">{SOURCE_TEXT[flag.source]}</span>
                      <span className="chip-row">
                        {flag.reasons.map((reason) => (
                          <Chip key={reason}>{reason}</Chip>
                        ))}
                      </span>
                    </span>
                  </td>
                  <td className="admin-num">{flag.hits}</td>
                  <td>{dayText(flag.createdAt)}</td>
                  <td>
                    <span className="admin-actions">
                      <Button variant="secondary" onClick={() => setWarning(flag)} disabled={busy || !flag.user}>
                        Send warning
                      </Button>
                      <Button
                        variant="secondary"
                       
                        onClick={() => run(() => adminApi.suspend(flag.user.id), `${flag.user.fullName} is suspended`)}
                        disabled={busy || !flag.canSuspend}
                        aria-describedby={flag.canSuspend ? undefined : `why-${flag.id}`}
                      >
                        Suspend
                      </Button>
                      <Button variant="ghost" onClick={() => run(() => adminApi.dismissFlag(flag.id), 'Flag dismissed')} disabled={busy}>
                        Dismiss
                      </Button>
                    </span>
                    {!flag.canSuspend && (
                      <span className="admin-hint" id={`why-${flag.id}`}>
                        Suspend needs a warning past its 7-day fix-by date
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {warning && (
        <WarningDialog
          user={warning.user}
          onCancel={() => setWarning(null)}
          onSubmit={async (body) => {
            await adminApi.warn(warning.user.id, body)
            setWarning(null)
            run(async () => {}, `Warning sent to ${warning.user.fullName}`)
          }}
        />
      )}
    </>
  )
}
