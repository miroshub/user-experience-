import { describe, expect, it } from 'vitest'
import { filterChips, jobCountText, withoutChip } from './filters'

const EMPTY = { role: null, skills: [], level: null, places: [], minPay: null }

describe('filterChips', () => {
  it('makes the H7 chips', () => {
    const chips = filterChips({ role: 'Frontend', skills: ['React'], level: 'Junior', places: ['Remote', 'Cairo'], minPay: 12000 })
    expect(chips.map((c) => c.text)).toEqual(['Role: Frontend (React)', 'Level: Junior', 'Where: Remote or Cairo', 'Pay: 12k+ EGP'])
  })

  it('shows skills as the role when there is no role word', () => {
    expect(filterChips({ ...EMPTY, skills: ['SQL', 'Excel'] })[0].text).toBe('Role: SQL, Excel')
  })

  it('has no chips with no filters', () => {
    expect(filterChips(EMPTY)).toEqual([])
  })
})

describe('withoutChip', () => {
  const full = { role: 'Frontend', skills: ['React'], level: 'Junior', places: ['Remote'], minPay: 12000 }

  it('removes the role with its skills', () => {
    expect(withoutChip(full, 'role')).toEqual({ ...full, role: null, skills: [] })
  })

  it('removes the places and the other filters', () => {
    expect(withoutChip(full, 'places').places).toEqual([])
    expect(withoutChip(full, 'minPay').minPay).toBeNull()
    expect(full.places).toEqual(['Remote'])
  })
})

describe('jobCountText', () => {
  it('uses the singular for one job', () => {
    expect(jobCountText(1)).toBe('1 job matches')
    expect(jobCountText(23)).toBe('23 jobs match')
  })
})
