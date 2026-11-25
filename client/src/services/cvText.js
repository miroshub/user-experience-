// Words on H6 My CV and the H2 "CV check" card

const DAY_MS = 24 * 60 * 60 * 1000

// The big words next to the ring: "Good start."
export function scoreHeadline(score) {
  if (score >= 90) return 'Great CV.'
  if (score >= 80) return 'Looking good.'
  if (score >= 50) return 'Good start.'
  return 'Needs some work.'
}

// "These 3 fixes could take you to about 92."
export function potentialText(tips, potential, quick = false) {
  if (tips.length === 0) return 'No quick fixes left. Nice work.'
  const fixes = quick ? 'quick fixes' : 'fixes'
  if (tips.length === 1) return `This fix could take you to about ${potential}.`
  return `${quick ? '' : 'These '}${tips.length} ${fixes} could take you to about ${potential}.`
}

// The button on each fix: Add, Shorten, Add dates, Write
export function fixButtonText(tip) {
  const { action } = tip
  if (action.type === 'addSkill') return 'Add'
  if (action.type === 'shortenSummary') return 'Shorten'
  if (action.section === 'experience' && action.index !== undefined) return 'Add dates'
  if (action.section === 'about') return 'Write'
  return 'Add'
}

// "Last edited today · checked against 12 saved jobs"
export function cvSubtitle(cv, checkedAgainst, now = new Date()) {
  const jobs = `checked against ${checkedAgainst.count} ${checkedAgainst.jobWord}`
  if (!cv.updatedAt) return `Not saved yet · ${jobs}`
  const days = Math.floor((startOfDay(now) - startOfDay(new Date(cv.updatedAt))) / DAY_MS)
  let edited = 'today'
  if (days === 1) edited = 'yesterday'
  else if (days > 1) edited = `${days} days ago`
  return `Last edited ${edited} · ${jobs}`
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// The grey words on the right of each section row
export function sectionStatus(cv) {
  const school = cv.education[0]
  return {
    summary: cv.summaryWords === 0
      ? { text: 'Empty', warn: true }
      : cv.summaryTooLong
        ? { text: 'Too long', warn: true }
        : { text: `${cv.summaryWords} words` },
    // Figma shows "2 roles" even with a date missing: the preview and the fix list point that out
    experience: cv.experience.length === 0
      ? { text: 'Empty', warn: true }
      : { text: `${cv.experience.length} ${cv.experience.length === 1 ? 'role' : 'roles'}` },
    education: school ? { text: school.school || school.degree } : { text: 'Empty', warn: true },
    skills: { text: `${cv.skills.length} ${cv.skills.length === 1 ? 'skill' : 'skills'}`, warn: cv.skills.length === 0 },
  }
}

// "Jul – Sep 2026", "2022 – 2026"
export function dateRange(start, end) {
  return [start, end].filter(Boolean).join(' – ')
}
