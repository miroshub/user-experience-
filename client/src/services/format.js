// Small text helpers shared by the swipe and job screens

const WORK_MODE_TEXT = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }
const DAY_MS = 24 * 60 * 60 * 1000

export function workModeText(mode) {
  return WORK_MODE_TEXT[mode] || mode
}

// 14000 → "14k", 14500 → "14.5k"
export function shortMoney(amount) {
  if (amount >= 1000) return `${Math.round(amount / 100) / 10}k`
  return String(amount)
}

// "EGP 14k–18k / month"
export function salaryText(min, max) {
  const range = min === max ? shortMoney(min) : `${shortMoney(min)}–${shortMoney(max)}`
  return `EGP ${range} / month`
}

// "Hybrid · Maadi"; remote jobs have no city
export function placeText(job) {
  return [workModeText(job.workMode), job.city].filter(Boolean).join(' · ')
}

// A company is shown by its company name, everyone else by their own name
export function displayName(user) {
  return user.role === 'company' ? user.companyName || user.fullName : user.fullName
}

// "Nile Byte" → "NB", "Salma" → "SA"
export function initials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

// Candidates are shown as "Omar H." until there is a match
export function shortName(fullName = '') {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  if (words.length < 2) return words[0] || ''
  return `${words[0]} ${words[1][0]}.`
}

// ---- Dates and times. Interviews are shown in Cairo time, like the H5 "TIME (CAIRO)" label. ----
const ZONE = 'Africa/Cairo'
const dayFormat = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short' })
const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const INTERVIEW_MINUTES = 30

// "Sun 3 Nov"
export function dayText(when) {
  return dayFormat.format(new Date(when))
}

// "11:00"
export function timeText(when) {
  return timeFormat.format(new Date(when))
}

// "Sun 3 Nov, 11:00"
export function dayTimeText(when) {
  return `${dayText(when)}, ${timeText(when)}`
}

// "Sun 3 Nov · 11:00–11:30 · Video call in Wuzzufny"
export function meetingText(interview) {
  const start = new Date(interview.dateTime)
  const end = new Date(start.getTime() + INTERVIEW_MINUTES * 60 * 1000)
  const how = interview.type === 'video' ? 'Video call in Wuzzufny' : 'In person'
  return `${dayText(start)} · ${timeText(start)}–${timeText(end)} · ${how}`
}

// "1h ago", "3 days ago"
export function agoText(when, now = new Date()) {
  const minutes = Math.max(0, Math.round((now - new Date(when)) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function daysText(days) {
  return `${days} day${days === 1 ? '' : 's'}`
}

// The next meeting that is still ahead (tests are not meetings)
export function nextMeeting(match, now = new Date()) {
  return (match.interviews || [])
    .filter((i) => i.type !== 'test' && new Date(i.dateTime) > now)
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))[0]
}

// The words under each status bar (FR-27, FR-28), always paired with the bar so colour is never alone.
// side: whose list this is, "seeker" or "company". icon: the small Figma icon in front of the words.
export function matchLabel(match, side = 'seeker', now = new Date()) {
  const days = match.quietDays ?? Math.floor((now - new Date(match.lastActivity)) / DAY_MS)
  if (match.status === 'closed') return { text: 'Closed', tone: 'muted', icon: null }
  if (side === 'seeker' && match.isWaiting) {
    return { text: `Waiting on them · ${daysText(Math.max(1, days))}`, tone: 'pending', icon: 'clock-amber' }
  }
  if (side === 'company' && match.lastActor !== 'company' && match.lastActor && days >= 1) {
    return { text: `Your reply is due · ${daysText(days)}`, tone: 'pending', icon: 'clock-amber' }
  }
  const meeting = nextMeeting(match, now)
  if (match.status === 'interview' && meeting) {
    return { text: `Interview · ${dayTimeText(meeting.dateTime)}`, tone: 'brand', icon: 'calendar-small' }
  }
  if (match.status === 'matched') return { text: 'Matched · say hi first', tone: 'brand', icon: 'chat-small' }
  if (match.status === 'chatting') {
    const theyWroteLast = match.lastActor && match.lastActor !== side
    const text = theyWroteLast ? `Chatting · replied ${agoText(match.lastActivity, now)}` : 'Chatting'
    return { text, tone: 'brand', icon: 'chat-small' }
  }
  const words = { interview: 'Interview', offer: 'Offer made', hired: 'Hired' }[match.status]
  return { text: words || match.status, tone: 'brand', icon: 'chat-small' }
}

const STEPS = ['matched', 'chatting', 'interview', 'offer', 'hired']

// A closed match keeps showing how far it got before it closed
export function barStatus(match) {
  if (match.status !== 'closed') return match.status
  return STEPS.filter((step) => match.stepDates?.[step]).pop() || 'matched'
}
