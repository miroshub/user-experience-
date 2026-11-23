import { describe, expect, it } from 'vitest'
import { dayTimeText, initials, matchLabel, meetingText, placeText, salaryText, shortName } from './format'

describe('format helpers', () => {
  it('writes salaries the way the job card does', () => {
    expect(salaryText(14000, 18000)).toBe('EGP 14k–18k / month')
    expect(salaryText(14500, 14500)).toBe('EGP 14.5k / month')
  })

  it('leaves the city out of remote jobs', () => {
    expect(placeText({ workMode: 'hybrid', city: 'Maadi' })).toBe('Hybrid · Maadi')
    expect(placeText({ workMode: 'remote', city: '' })).toBe('Remote')
  })

  it('makes initials and short names', () => {
    expect(initials('Nile Byte')).toBe('NB')
    expect(initials('Salma')).toBe('SA')
    expect(shortName('Omar Hassan')).toBe('Omar H.')
  })

  it('shows interview times in Cairo time, like H4', () => {
    // 09:00 UTC is 11:00 in Cairo in November
    expect(dayTimeText('2026-11-22T09:00:00Z')).toBe('Sun 22 Nov, 11:00')
    expect(meetingText({ type: 'video', dateTime: '2026-11-22T09:00:00Z' })).toBe('Sun 22 Nov · 11:00–11:30 · Video call in Wuzzufny')
    expect(meetingText({ type: 'in person', dateTime: '2026-11-22T09:00:00Z' })).toBe('Sun 22 Nov · 11:00–11:30 · In person')
  })

  it('labels a quiet match as waiting for the seeker, and as a reply due for the company', () => {
    const now = new Date('2026-11-17T12:00:00Z')
    const quiet = { status: 'chatting', isWaiting: true, quietDays: 6, lastActor: 'seeker', lastActivity: '2026-11-11T12:00:00Z' }
    expect(matchLabel(quiet, 'seeker', now)).toEqual({ text: 'Waiting on them · 6 days', tone: 'pending', icon: 'clock-amber' })
    expect(matchLabel({ ...quiet, quietDays: 4 }, 'company', now).text).toBe('Your reply is due · 4 days')
  })

  it('says what is next on every other step', () => {
    const now = new Date('2026-11-17T12:00:00Z')
    expect(matchLabel({ status: 'matched' }, 'seeker', now).text).toBe('Matched · say hi first')
    expect(matchLabel({ status: 'chatting', lastActor: 'seeker', quietDays: 0, lastActivity: '2026-11-17T11:00:00Z' }, 'company', now).text)
      .toBe('Chatting · replied 1h ago')
    const interview = { status: 'interview', quietDays: 0, interviews: [{ type: 'video', dateTime: '2026-11-22T09:00:00Z' }] }
    expect(matchLabel(interview, 'seeker', now)).toMatchObject({ text: 'Interview · Sun 22 Nov, 11:00', icon: 'calendar-small' })
    expect(matchLabel({ status: 'closed' }, 'seeker', now).text).toBe('Closed')
  })
})
