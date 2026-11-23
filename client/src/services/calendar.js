// "Add to calendar" on H4: a small .ics file that Google, Outlook and Apple calendars all open
const INTERVIEW_MINUTES = 30

function icsTime(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function icsText(text = '') {
  return text.replace(/[\\,;]/g, (char) => `\\${char}`).replace(/\n/g, '\\n')
}

export function interviewToIcs(interview, title, where) {
  const start = new Date(interview.dateTime)
  const end = new Date(start.getTime() + INTERVIEW_MINUTES * 60 * 1000)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wuzzufny//Interview//EN',
    'BEGIN:VEVENT',
    `UID:${interview.id}@wuzzufny`,
    `DTSTAMP:${icsTime(new Date())}`,
    `DTSTART:${icsTime(start)}`,
    `DTEND:${icsTime(end)}`,
    `SUMMARY:${icsText(title)}`,
    `LOCATION:${icsText(where)}`,
    `DESCRIPTION:${icsText(interview.note || '')}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Interview in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcs(interview, title, where) {
  const blob = new Blob([interviewToIcs(interview, title, where)], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'wuzzufny-interview.ics'
  link.click()
  URL.revokeObjectURL(url)
}
