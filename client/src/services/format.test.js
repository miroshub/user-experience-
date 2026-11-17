import { describe, expect, it } from 'vitest'
import { initials, matchLabel, placeText, salaryText, shortName } from './format'

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

  it('labels a quiet match as waiting, with the number of days', () => {
    const now = new Date('2026-11-17T12:00:00Z')
    const sixDaysAgo = new Date('2026-11-11T12:00:00Z')
    expect(matchLabel({ status: 'chatting', isWaiting: true, lastActivity: sixDaysAgo }, now)).toEqual({
      text: 'Waiting on them · 6 days',
      tone: 'pending',
    })
    expect(matchLabel({ status: 'matched', isWaiting: false }).text).toBe('Matched · say hi')
  })
})
