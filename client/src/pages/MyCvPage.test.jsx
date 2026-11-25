import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MyCvPage } from './MyCvPage'
import { cvApi } from '../services/CvApi'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 's1', fullName: 'Salma Adel', role: 'seeker' } }),
}))
vi.mock('../services/CvApi', () => ({
  cvApi: { get: vi.fn(), save: vi.fn(), fix: vi.fn(), uploadPdf: vi.fn(), exportPdf: vi.fn(), uploadedPdf: vi.fn() },
}))
vi.mock('../services/SwipeApi', () => ({
  swipeApi: { matches: vi.fn().mockResolvedValue([]) },
}))

// The Figma H6 example
function salma(changes = {}) {
  return {
    cv: {
      id: 'cv1',
      fullName: 'Salma Adel',
      headline: 'Frontend developer',
      city: 'Cairo',
      email: 'salma@example.com',
      phone: null,
      summary: 'Fresh computer science graduate who loves building things.',
      summaryWords: 140,
      summaryTooLong: true,
      experience: [
        { title: 'Frontend Intern', company: 'Koshk Labs (remote)', startDate: 'Jul 2026', endDate: 'Sep 2026', bullets: ['Rebuilt the sign-up flow'] },
        { title: 'Freelance web projects', company: '', startDate: '', endDate: '', bullets: ['Bus-tracking web app'] },
      ],
      rolesMissingDates: [1],
      education: [{ degree: 'BSc Computer Science', school: 'Cairo University', startYear: '2022', endYear: '2026' }],
      skills: ['JavaScript', 'HTML', 'CSS'],
      pdfUrl: null,
      updatedAt: new Date().toISOString(),
      ...changes,
    },
    ats: {
      score: 74,
      potential: 92,
      checkedAgainst: { count: 12, jobWord: 'saved jobs' },
      tips: [
        { key: 'skill:react', gain: 8, text: 'Add React to your skills. 6 of your saved jobs ask for it.', action: { type: 'addSkill', skill: 'React' } },
        { key: 'summary:long', gain: 6, text: 'Your "About me" is 140 words. Aim for under 60.', action: { type: 'shortenSummary' } },
        { key: 'dates', gain: 4, text: 'Add start and end dates to "Freelance web projects".', action: { type: 'open', section: 'experience', index: 1 } },
      ],
    },
  }
}

function showPage() {
  render(
    <MemoryRouter>
      <MyCvPage />
    </MemoryRouter>,
  )
}

describe('H6 My CV', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cvApi.get.mockResolvedValue(salma())
  })

  it('shows the score, the fixes and what recruiters see (FR-08, FR-09)', async () => {
    showPage()
    expect(await screen.findByRole('img', { name: 'ATS score 74 out of 100' })).toBeInTheDocument()
    expect(screen.getByText('Good start.')).toBeInTheDocument()
    expect(screen.getByText('These 3 fixes could take you to about 92.')).toBeInTheDocument()
    expect(screen.getByText('Last edited today · checked against 12 saved jobs')).toBeInTheDocument()
    expect(screen.getByText('+8')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Shorten' })).toBeInTheDocument()

    // problems in the preview are named in words, not only tinted
    expect(screen.getByText('Dates missing')).toBeInTheDocument()
    expect(screen.getByText('Too long')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add React to your skills' })).toBeInTheDocument()
  })

  it('a one-click fix sends the action and shows the new score', async () => {
    cvApi.fix.mockResolvedValue({ ...salma({ skills: ['JavaScript', 'HTML', 'CSS', 'React'] }), ats: { ...salma().ats, score: 82, tips: [] } })
    showPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Add' }))

    expect(cvApi.fix).toHaveBeenCalledWith({ type: 'addSkill', skill: 'React' })
    expect(await screen.findByRole('img', { name: 'ATS score 82 out of 100' })).toBeInTheDocument()
    expect(screen.getByText('React added to your skills.')).toBeInTheDocument()
  })

  it('"Add dates" opens the experience form, and saving sends the whole section', async () => {
    cvApi.save.mockResolvedValue(salma({ rolesMissingDates: [] }))
    showPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Add dates' }))

    const dialog = screen.getByRole('dialog', { name: 'Experience' })
    const starts = within(dialog).getAllByLabelText('Start')
    expect(starts[1]).toHaveFocus()
    await userEvent.type(starts[1], 'Jan 2026')
    await userEvent.type(within(dialog).getAllByLabelText('End')[1], 'Jun 2026')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const sent = cvApi.save.mock.calls[0][0].experience
    expect(sent[1]).toEqual({ title: 'Freelance web projects', company: '', startDate: 'Jan 2026', endDate: 'Jun 2026', bullets: ['Bus-tracking web app'] })
  })

  it('a save error stays in the dialog', async () => {
    cvApi.save.mockRejectedValue(new Error('Each role must have a title'))
    showPage()
    await userEvent.click(await screen.findByRole('button', { name: /About me/ }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Each role must have a title')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows an error when the CV cannot load', async () => {
    cvApi.get.mockRejectedValue(new Error('Cannot reach the server. Is it running?'))
    showPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
  })
})
