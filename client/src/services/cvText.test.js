import { describe, expect, it } from 'vitest'
import { cvSubtitle, dateRange, fixButtonText, potentialText, scoreHeadline, sectionStatus } from './cvText'

describe('cvText', () => {
  it('scoreHeadline', () => {
    expect(scoreHeadline(74)).toBe('Good start.')
    expect(scoreHeadline(95)).toBe('Great CV.')
    expect(scoreHeadline(85)).toBe('Looking good.')
    expect(scoreHeadline(20)).toBe('Needs some work.')
  })

  it('potentialText, like the Figma frames', () => {
    const three = [{}, {}, {}]
    expect(potentialText(three, 92)).toBe('These 3 fixes could take you to about 92.')
    expect(potentialText(three, 92, true)).toBe('3 quick fixes could take you to about 92.')
    expect(potentialText([{}], 80)).toBe('This fix could take you to about 80.')
    expect(potentialText([], 100)).toBe('No quick fixes left. Nice work.')
  })

  it('fixButtonText', () => {
    expect(fixButtonText({ action: { type: 'addSkill', skill: 'React' } })).toBe('Add')
    expect(fixButtonText({ action: { type: 'shortenSummary' } })).toBe('Shorten')
    expect(fixButtonText({ action: { type: 'open', section: 'experience', index: 1 } })).toBe('Add dates')
    expect(fixButtonText({ action: { type: 'open', section: 'about' } })).toBe('Write')
    expect(fixButtonText({ action: { type: 'open', section: 'education' } })).toBe('Add')
  })

  it('cvSubtitle', () => {
    const now = new Date(2026, 10, 23, 15)
    const against = { count: 12, jobWord: 'saved jobs' }
    expect(cvSubtitle({ updatedAt: new Date(2026, 10, 23, 9) }, against, now)).toBe('Last edited today · checked against 12 saved jobs')
    expect(cvSubtitle({ updatedAt: new Date(2026, 10, 22, 23) }, against, now)).toBe('Last edited yesterday · checked against 12 saved jobs')
    expect(cvSubtitle({ updatedAt: new Date(2026, 10, 18) }, against, now)).toContain('5 days ago')
    expect(cvSubtitle({ updatedAt: null }, { count: 20, jobWord: 'open jobs' }, now)).toBe('Not saved yet · checked against 20 open jobs')
  })

  it('sectionStatus', () => {
    const cv = {
      summaryWords: 140, summaryTooLong: true,
      experience: [{}, {}], rolesMissingDates: [],
      education: [{ school: 'Cairo University', degree: 'BSc' }],
      skills: ['a', 'b'],
    }
    expect(sectionStatus(cv)).toEqual({
      summary: { text: 'Too long', warn: true },
      experience: { text: '2 roles' },
      education: { text: 'Cairo University' },
      skills: { text: '2 skills', warn: false },
    })
    const empty = { summaryWords: 0, summaryTooLong: false, experience: [], rolesMissingDates: [], education: [], skills: [] }
    expect(sectionStatus(empty).summary.text).toBe('Empty')
    expect(sectionStatus(empty).experience.text).toBe('Empty')
    expect(sectionStatus(empty).education.text).toBe('Empty')
    expect(sectionStatus({ ...cv, summaryTooLong: false, summaryWords: 40, experience: [{}], rolesMissingDates: [0] })).toMatchObject({
      summary: { text: '40 words' },
      experience: { text: '1 role' },
    })
  })

  it('dateRange', () => {
    expect(dateRange('Jul 2026', 'Sep 2026')).toBe('Jul 2026 – Sep 2026')
    expect(dateRange('2022', '')).toBe('2022')
  })
})
