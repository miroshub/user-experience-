import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { Button } from '../components/Button'
import { Dialog } from '../components/Dialog'
import { Icon } from '../components/Icon'
import { TextField } from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { trustApi } from '../services/TrustApi'
import './ProfilePage.css'
import './DataPage.css'

// What each number means, in plain words. roles: who has this kind of data.
const ROWS = [
  { key: 'profile', label: 'Your profile', text: 'Name, email or phone, and what you filled in', roles: ['seeker', 'company'] },
  { key: 'cv', label: 'CV', text: 'Your CV and its ATS score', roles: ['seeker'] },
  { key: 'jobs', label: 'Jobs', text: 'The jobs you posted', roles: ['company'] },
  { key: 'swipes', label: 'Swipes', text: 'Every Interested and Skip', roles: ['seeker', 'company'] },
  { key: 'matches', label: 'Matches', text: 'Shared with the other side', roles: ['seeker', 'company'] },
  { key: 'messages', label: 'Messages you sent', text: 'Chat messages in your matches', roles: ['seeker', 'company'] },
  { key: 'aiTurns', label: 'Ask wuzzufny', text: 'Your questions and the answers', roles: ['seeker'] },
  { key: 'reviewsWritten', label: 'Reviews you wrote', text: 'Stars, tags and comments', roles: ['seeker', 'company'] },
  { key: 'tickets', label: 'Messages to support', text: 'And the replies', roles: ['seeker', 'company'] },
  { key: 'warnings', label: 'Warnings', text: 'From the moderators', roles: ['seeker', 'company'] },
  { key: 'files', label: 'Files', text: 'Your ID scan, logo, images or CV PDF', roles: ['seeker', 'company'] },
]

function countText(key, counts) {
  if (key === 'profile') return '1'
  return String(counts[key] ?? 0)
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// FR-05 "Your data": see it, download it, delete the account. No Figma frame:
// built from the H8 Trust centre card and the H5 dialog parts.
export function DataPage() {
  const { user, forget } = useAuth()
  const navigate = useNavigate()
  const [counts, setCounts] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    trustApi.dataSummary().then(setCounts).catch((err) => setError(err.message))
  }, [])

  async function download() {
    setDownloading(true)
    setError('')
    try {
      saveBlob(await trustApi.downloadData(), 'wuzzufny-my-data.json')
      setNotice('Downloaded wuzzufny-my-data.json')
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloading(false)
    }
  }

  async function deleteAccount(password) {
    await trustApi.deleteAccount(password)
    forget()
    navigate('/', { replace: true })
  }

  const rows = ROWS.filter((row) => row.roles.includes(user.role))

  return (
    <AppLayout>
      <div className="profile-page data-page">
        <Link to="/profile" className="data-page__back">
          <Icon name="back" />
          Profile
        </Link>
        <header className="data-page__head">
          <h1 className="profile-head__name">Your data</h1>
          <p className="profile-head__sub">Everything wuzzufny keeps about you. Nothing is sold or shared with other companies.</p>
        </header>

        <div className="notice-area" aria-live="polite">
          {notice && <p className="notice">{notice}</p>}
        </div>
        {error && (
          <p className="profile-page__error" role="alert">
            {error}
          </p>
        )}

        <div className="profile-columns">
          <section className="profile-col profile-col--trust" aria-labelledby="kept-heading">
            <h2 className="overline" id="kept-heading">
              What we keep
            </h2>
            {!counts && !error && <p className="profile-page__loading">Loading…</p>}
            {counts && (
              <ul className="trust-card data-list">
                {rows.map((row) => (
                  <li key={row.key} className="data-row">
                    <span className="trust-row__text">
                      <span className="trust-row__title">{row.label}</span>
                      <span className="trust-row__sub">{row.text}</span>
                    </span>
                    <span className="data-row__count">{countText(row.key, counts)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="profile-col" aria-label="Download or delete">
            <h2 className="overline">Download</h2>
            <div className="looking-card">
              <p className="trust-row__sub">One JSON file with everything in the list. Your password is never in it.</p>
              <Button variant="secondary" onClick={download} disabled={downloading}>
                {downloading ? 'Preparing…' : 'Download my data'}
              </Button>
            </div>

            <h2 className="overline">Delete account</h2>
            <div className="looking-card data-page__danger">
              <p className="trust-row__title">This can’t be undone</p>
              <p className="trust-row__sub">
                Your profile, CV, swipes, reviews you wrote, support messages and files are deleted. Your open matches are closed
                with the reason “Account deleted”, and the other side sees “Deleted user” in the chat.
              </p>
              <Button className="data-page__delete" onClick={() => setDeleting(true)}>
                Delete my account
              </Button>
            </div>
          </section>
        </div>
      </div>

      {deleting && <DeleteAccountDialog onCancel={() => setDeleting(false)} onSubmit={deleteAccount} />}
    </AppLayout>
  )
}

function DeleteAccountDialog({ onCancel, onSubmit }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit(event) {
    event?.preventDefault()
    if (!password) return setError('Type your password')
    setSending(true)
    setError('')
    try {
      await onSubmit(password)
    } catch (err) {
      setError(err.message)
      setSending(false)
    }
  }

  return (
    <Dialog
      title="Delete your account?"
      subtitle="Type your password to confirm"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" className="dialog__cancel" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="dialog__submit data-page__delete" onClick={handleSubmit} disabled={sending}>
            Delete for good
          </Button>
        </>
      }
    >
      <form className="dialog__group" onSubmit={handleSubmit}>
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </form>
      {error && (
        <p className="dialog__error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  )
}
