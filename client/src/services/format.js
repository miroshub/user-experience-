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

// The words under each status bar in "Your matches"
export function matchLabel(match, now = new Date()) {
  if (match.isWaiting) {
    const days = Math.max(1, Math.floor((now - new Date(match.lastActivity)) / DAY_MS))
    return { text: `Waiting on them · ${days} day${days === 1 ? '' : 's'}`, tone: 'pending' }
  }
  const text = {
    matched: 'Matched · say hi',
    chatting: 'Chatting',
    interview: 'Interview',
    offer: 'Offer',
    hired: 'Hired',
    closed: 'Closed',
  }[match.status]
  return { text: text || match.status, tone: match.status === 'closed' ? 'muted' : 'brand' }
}
