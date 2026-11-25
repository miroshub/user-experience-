import { useCallback, useState } from 'react'
import { adminApi } from '../../services/AdminApi'
import { Button } from '../Button'
import { TextField } from '../TextField'
import { TabStatus, UserCell, WarningDialog } from './AdminParts'
import { useAdminData } from './useAdminData'

// Find any account by name, company or email, and warn it even if it was never flagged
export function UsersTab() {
  const [typed, setTyped] = useState('')
  const [search, setSearch] = useState('')
  const loader = useCallback(() => adminApi.users(search), [search])
  const { items, error, notice, busy, run } = useAdminData(loader)
  const [warning, setWarning] = useState(null)

  return (
    <>
      <form
        className="admin-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(typed.trim())
        }}
      >
        <TextField label="Name, company or email" value={typed} maxLength={50} onChange={(e) => setTyped(e.target.value)} />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      <TabStatus items={items} error={error} notice={notice} empty="Nobody matches that search." />
      {items && items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <caption className="visually-hidden">Accounts</caption>
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col">Verified</th>
                <th scope="col">State</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((user) => (
                <tr key={user.id}>
                  <td>
                    <UserCell user={user} />
                  </td>
                  <td>{user.isVerified ? 'Yes' : 'Not yet'}</td>
                  <td>{user.accountState === 'suspended' ? 'Suspended' : 'Active'}</td>
                  <td>
                    <Button variant="secondary" onClick={() => setWarning(user)} disabled={busy}>
                      Send warning
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {warning && (
        <WarningDialog
          user={warning}
          onCancel={() => setWarning(null)}
          onSubmit={async (body) => {
            await adminApi.warn(warning.id, body)
            setWarning(null)
            run(async () => {}, `Warning sent to ${warning.fullName}`)
          }}
        />
      )}
    </>
  )
}
