import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { EditProfileDialog } from '../components/EditProfileDialog'
import { Icon } from '../components/Icon'
import { SupportDialog } from '../components/SupportDialog'
import { useAuth } from '../context/AuthContext'
import { assistantApi } from '../services/AssistantApi'
import { displayName, initials, shortMoney } from '../services/format'
import { swipeApi } from '../services/SwipeApi'
import { trustApi } from '../services/TrustApi'
import './ProfilePage.css'

const NOTIFICATIONS = [
  { key: 'matches', label: 'New matches', on: true },
  { key: 'messages', label: 'Messages', on: true },
  { key: 'reminders', label: 'Interview reminders', on: true },
  { key: 'cvTips', label: 'Weekly CV tips', on: false },
]
const PREFS_KEY = 'wuzzufny.notifications'

// Notification switches only change what this browser shows, so they live in the browser
function loadPrefs() {
  const defaults = Object.fromEntries(NOTIFICATIONS.map((n) => [n.key, n.on]))
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }
  } catch {
    return defaults
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // private browsing: the switch still works until the page is closed
  }
}

function dayMonth(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function subtitleOf(user) {
  if (user.role === 'company') return [user.industry, user.location].filter(Boolean).join(' · ')
  return [user.headline, user.city, 'Open to work'].filter(Boolean).join(' · ')
}

function verifiedText(user) {
  if (!user.isVerified) return null
  const when = user.verifiedAt ? ` once on ${dayMonth(user.verifiedAt)}` : ''
  return `Verified${when}. You won’t be asked again.`
}

function warningSummary(warnings) {
  if (warnings.length === 0) return 'None so far'
  const open = warnings.filter((w) => w.status !== 'fixed').length
  const total = `${warnings.length} warning${warnings.length === 1 ? '' : 's'}`
  return open > 0 ? `${total}, ${open} still open` : `${total}, all fixed`
}

const STATUS_TEXT = { open: 'Open', expired: 'Past the fix-by date', fixed: 'Fixed' }

// One row of the Trust centre list. A row with an action is a button or a link, with a chevron.
function TrustRow({ icon, title, text, onClick, to, expanded }) {
  const body = (
    <>
      <span className="trust-row__icon">
        <Icon name={icon} />
      </span>
      <span className="trust-row__text">
        <span className="trust-row__title">{title}</span>
        <span className="trust-row__sub">{text}</span>
      </span>
      {(onClick || to) && <Icon name="chevron" className={expanded ? 'trust-row__chevron--open' : ''} />}
    </>
  )
  if (to) {
    return (
      <Link to={to} className="trust-row trust-row--action">
        {body}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" className="trust-row trust-row--action" onClick={onClick} aria-expanded={expanded}>
        {body}
      </button>
    )
  }
  return <div className="trust-row">{body}</div>
}

// FR-07: "all good", or the open warning with its reason and fix-by date
function HealthBanner({ health, warning }) {
  if (health === 'good') {
    return (
      <div className="trust-health trust-health--good">
        <span className="trust-health__badge">
          <Icon name="check-18" />
        </span>
        <div className="trust-health__text">
          <p className="trust-health__title">Account health: all good</p>
          <p className="trust-health__body">
            No warnings. If something ever needs fixing, we’ll tell you why and give you 7 days before anything changes.
          </p>
        </div>
      </div>
    )
  }
  const late = warning.status === 'expired'
  return (
    <div className="trust-health trust-health--warning" role="status">
      <span className="trust-health__badge">
        <Icon name="clock-amber" />
      </span>
      <div className="trust-health__text">
        <p className="trust-health__title">Account health: one thing to fix</p>
        <p className="trust-health__body">
          {warning.reason}. {late ? 'The fix-by date has passed' : `Please fix it by ${dayMonth(warning.deadline)}`} (
          {late ? 'your account can now be suspended' : `${warning.daysLeft} days left`}). Talk to support if you think
          this is a mistake.
        </p>
      </div>
    </div>
  )
}

// H8 Profile + Trust centre (Figma 8:740): FR-04, FR-06, FR-07, and the way in to FR-05
export function ProfilePage() {
  const { user, replaceUser, logOut } = useAuth()
  const [trust, setTrust] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialog, setDialog] = useState(null) // 'support' | 'edit'
  const [showWarnings, setShowWarnings] = useState(false)
  const [lookingFor, setLookingFor] = useState(null)
  const [prefs, setPrefs] = useState(loadPrefs)
  const [newMatches, setNewMatches] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    trustApi.overview().then(setTrust).catch((err) => setError(err.message))
    swipeApi
      .matches()
      .then((matches) => setNewMatches(matches.filter((m) => m.status === 'matched').length))
      .catch(() => setNewMatches(0))
    // What the seeker told Ask wuzzufny they want (H7 filters)
    if (user.role === 'seeker') {
      assistantApi
        .open()
        .then((chat) => setLookingFor(chat.filters))
        .catch(() => setLookingFor(null))
    }
  }, [user.role])

  async function sendTicket(ticket) {
    const sent = await trustApi.contactSupport(ticket)
    setTrust({ ...trust, tickets: [sent, ...trust.tickets] })
    setDialog(null)
    setNotice(`Sent. ${sent.replyPromise}.`)
  }

  async function saveProfile(changes) {
    replaceUser(await trustApi.updateProfile(changes))
    setDialog(null)
    setNotice('Profile saved')
  }

  async function handleLogOut() {
    await logOut()
    navigate('/')
  }

  function toggle(key) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    savePrefs(next)
  }

  const name = displayName(user)
  const verified = verifiedText(user)

  return (
    <AppLayout newMatches={newMatches}>
      <div className="profile-page">
        <header className="profile-head">
          <span className="profile-head__avatar" aria-hidden="true">
            {initials(name)}
          </span>
          <div className="profile-head__text">
            <h1 className="profile-head__name">{name}</h1>
            {subtitleOf(user) && <p className="profile-head__sub">{subtitleOf(user)}</p>}
            {verified ? (
              <p className="profile-head__verified">
                <Icon name="shield-small" />
                {verified}
              </p>
            ) : (
              <p className="profile-head__unverified">Not verified yet. You’ll be asked for your ID once, the first time you say Interested.</p>
            )}
          </div>
          <Button variant="secondary" onClick={() => setDialog('edit')}>
            Edit profile
          </Button>
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
          <section className="profile-col profile-col--trust" aria-labelledby="trust-heading">
            <h2 className="overline" id="trust-heading">
              Trust centre
            </h2>
            {!trust && !error && <p className="profile-page__loading">Loading…</p>}
            {trust && (
              <div className="trust-card">
                <HealthBanner health={trust.health} warning={trust.openWarning} />
                <TrustRow icon="chat-row" title="Talk to support" text={trust.replyPromise} onClick={() => setDialog('support')} />
                <TrustRow icon="data" title="Your data" text="See what we keep, download it, or delete your account" to="/profile/data" />
                <TrustRow icon="card" title="Plan" text="Free. Swiping and matching will always be free" />
                <TrustRow
                  icon="clock-row"
                  title="Warning history"
                  text={warningSummary(trust.warnings)}
                  onClick={trust.warnings.length > 0 ? () => setShowWarnings(!showWarnings) : undefined}
                  expanded={showWarnings}
                />
                {showWarnings && (
                  <ul className="trust-list" aria-label="Warning history">
                    {trust.warnings.map((w) => (
                      <li key={w.id} className="trust-list__item">
                        <span className="trust-list__title">{w.reason}</span>
                        <span className="trust-list__meta">
                          {STATUS_TEXT[w.status]} · sent {dayMonth(w.createdAt)} · fix by {dayMonth(w.deadline)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {trust && trust.tickets.length > 0 && (
              <>
                <h2 className="overline">Your messages to support</h2>
                <ul className="trust-card trust-list" aria-label="Your messages to support">
                  {trust.tickets.map((t) => (
                    <li key={t.id} className="trust-list__item">
                      <span className="trust-list__title">{t.topic}</span>
                      <span className="trust-list__meta">
                        {t.status === 'closed' ? 'Closed' : 'Open'} · sent {dayMonth(t.createdAt)}
                      </span>
                      <span className="trust-list__body">{t.message}</span>
                      {t.reply ? (
                        <span className="trust-list__reply">
                          <strong>Support:</strong> {t.reply}
                        </span>
                      ) : (
                        <span className="trust-list__meta">Waiting for a reply</span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="profile-col" aria-label="Preferences">
            {user.role === 'seeker' && (
              <>
                <h2 className="overline">What you’re looking for</h2>
                <div className="looking-card">
                  <LookingRow label="Roles" values={lookingFor?.role ? [lookingFor.role] : []} />
                  <LookingRow label="Where" values={lookingFor?.places || []} />
                  <LookingRow label="Pay" values={lookingFor?.minPay ? [`${shortMoney(lookingFor.minPay)}+ EGP / month`] : []} />
                  <LookingRow label="Skills" values={user.skills || []} />
                  <Link className="looking-card__edit" to="/swipe/ask">
                    Change this with Ask wuzzufny
                  </Link>
                </div>
              </>
            )}

            <h2 className="overline">Notifications</h2>
            <ul className="notify-card">
              {NOTIFICATIONS.map((n) => (
                <li key={n.key} className="notify-row">
                  <span className="notify-row__label" id={`notify-${n.key}`}>
                    {n.label}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs[n.key]}
                    aria-labelledby={`notify-${n.key}`}
                    className={`switch${prefs[n.key] ? ' switch--on' : ''}`}
                    onClick={() => toggle(n.key)}
                  />
                  <span className="notify-row__state" aria-hidden="true">
                    {prefs[n.key] ? 'On' : 'Off'}
                  </span>
                </li>
              ))}
            </ul>

            <button type="button" className="logout" onClick={handleLogOut}>
              <Icon name="logout" />
              Log out
            </button>
          </section>
        </div>
      </div>

      {dialog === 'support' && (
        <SupportDialog replyPromise={trust.replyPromise} onCancel={() => setDialog(null)} onSubmit={sendTicket} />
      )}
      {dialog === 'edit' && <EditProfileDialog user={user} onCancel={() => setDialog(null)} onSubmit={saveProfile} />}
    </AppLayout>
  )
}

function LookingRow({ label, values }) {
  return (
    <div className="looking-row">
      <span className="looking-row__label">{label}</span>
      <span className="chip-row">
        {values.length > 0 ? values.map((v) => <Chip key={v}>{v}</Chip>) : <span className="looking-row__empty">Not set yet</span>}
      </span>
    </div>
  )
}
