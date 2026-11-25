import { shortMoney } from './format'

// H7 filter chips: "Role: Frontend (React)", "Level: Junior", "Where: Remote or Cairo", "Pay: 12k+ EGP"
export function filterChips(filters) {
  const chips = []
  if (filters.role || filters.skills.length > 0) {
    const role = filters.role || filters.skills.join(', ')
    const extra = filters.role && filters.skills.length > 0 ? ` (${filters.skills.join(', ')})` : ''
    chips.push({ key: 'role', text: `Role: ${role}${extra}` })
  }
  if (filters.level) chips.push({ key: 'level', text: `Level: ${filters.level}` })
  if (filters.places.length > 0) chips.push({ key: 'places', text: `Where: ${filters.places.join(' or ')}` })
  if (filters.minPay) chips.push({ key: 'minPay', text: `Pay: ${shortMoney(filters.minPay)}+ EGP` })
  return chips
}

// The filters after the x on one chip. The role chip holds the skills too, so both go.
export function withoutChip(filters, key) {
  const next = { ...filters, skills: [...filters.skills], places: [...filters.places] }
  if (key === 'role') {
    next.role = null
    next.skills = []
  } else if (key === 'places') {
    next.places = []
  } else {
    next[key] = null
  }
  return next
}

// "1 job match", "23 jobs match"
export function jobCountText(total) {
  return `${total} ${total === 1 ? 'job matches' : 'jobs match'}`
}
