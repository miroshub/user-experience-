import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AskPage } from './AskPage'
import { assistantApi } from '../services/AssistantApi'
import { swipeApi } from '../services/SwipeApi'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 's1', fullName: 'Salma Adel', role: 'seeker' } }),
}))
vi.mock('../services/AssistantApi', () => ({
  assistantApi: { open: vi.fn(), ask: vi.fn(), setFilters: vi.fn() },
}))
vi.mock('../services/SwipeApi', () => ({
  swipeApi: { matches: vi.fn(), swipe: vi.fn() },
}))

const EMPTY = { role: null, skills: [], level: null, places: [], minPay: null }
const FILTERS = { role: 'Frontend', skills: ['React'], level: 'Junior', places: ['Remote', 'Cairo'], minPay: 12000 }

function job(id, title, fit) {
  return {
    id,
    companyId: 'c1',
    title,
    salaryMin: 14000,
    salaryMax: 18000,
    workMode: 'hybrid',
    city: 'Maadi',
    description: 'A small team.',
    fit,
    whyItFits: ['React'],
    missingSkills: ['TypeScript'],
    company: { id: 'c1', name: 'Nile Byte' },
  }
}

const ANSWER = {
  turns: [{ userMessage: 'Remote junior React jobs. Cairo is fine too.', aiReply: 'Got it. Here are your filters.' }],
  filters: FILTERS,
  results: { total: 2, jobs: [job('j1', 'Junior Frontend Developer', 82), job('j2', 'React Developer (Junior)', 78)], tip: { skill: 'TypeScript', count: 2 } },
}

function showPage() {
  render(
    <MemoryRouter>
      <AskPage />
    </MemoryRouter>,
  )
}

describe('H7 Ask wuzzufny', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    swipeApi.matches.mockResolvedValue([])
    assistantApi.open.mockResolvedValue({ turns: [], filters: EMPTY, results: { total: 5, jobs: [], tip: null } })
  })

  it('turns words into chips, and "Show N jobs" shows the jobs (FR-19)', async () => {
    assistantApi.ask.mockResolvedValue(ANSWER)
    showPage()
    expect(await screen.findByText('Your matching jobs show here.')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Ask for jobs in your own words'), 'Remote junior React jobs. Cairo is fine too.')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(assistantApi.ask).toHaveBeenCalledWith('Remote junior React jobs. Cairo is fine too.')
    expect(await screen.findByRole('button', { name: 'Remove filter Role: Frontend (React)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove filter Where: Remote or Cairo' })).toBeInTheDocument()
    expect(screen.getByLabelText('Ask for jobs in your own words')).toHaveValue('')

    await userEvent.click(screen.getByRole('button', { name: 'Show 2 jobs' }))
    expect(screen.getByRole('heading', { name: '2 jobs match' })).toBeInTheDocument()
    expect(screen.getByText('82% fit')).toBeInTheDocument()
  })

  it('shows the CV tip for these jobs (FR-21)', async () => {
    assistantApi.open.mockResolvedValue(ANSWER)
    showPage()
    expect(await screen.findByText(/Heads up: 2 of these ask for TypeScript/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'add it to your CV' })).toHaveAttribute('href', '/cv')
  })

  it('the x on a chip sends the filters without it', async () => {
    assistantApi.open.mockResolvedValue(ANSWER)
    assistantApi.setFilters.mockResolvedValue({ ...ANSWER, filters: { ...FILTERS, minPay: null } })
    showPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Remove filter Pay: 12k+ EGP' }))
    expect(assistantApi.setFilters).toHaveBeenCalledWith({ ...FILTERS, minPay: null })
    expect(screen.queryByRole('button', { name: 'Remove filter Pay: 12k+ EGP' })).not.toBeInTheDocument()
  })

  it('a suggestion is asked straight away', async () => {
    assistantApi.ask.mockResolvedValue(ANSWER)
    showPage()
    await userEvent.click(await screen.findByRole('button', { name: '“Which jobs fit my CV best?”' }))
    expect(assistantApi.ask).toHaveBeenCalledWith('Which jobs fit my CV best?')
  })

  it('Interested from the list removes the job and links to the new match', async () => {
    assistantApi.open.mockResolvedValue(ANSWER)
    swipeApi.swipe.mockResolvedValue({ match: { id: 'm9' } })
    showPage()

    await userEvent.click(await screen.findByRole('button', { name: /Junior Frontend Developer/ }))
    const row = screen.getByRole('button', { name: /Junior Frontend Developer/ }).closest('article')
    await userEvent.click(within(row).getByRole('button', { name: 'Interested' }))

    expect(swipeApi.swipe).toHaveBeenCalledWith({ jobId: 'j1', interested: true })
    expect(await screen.findByRole('link', { name: 'Say hi' })).toHaveAttribute('href', '/matches/m9')
    expect(screen.getByRole('heading', { name: '1 job matches' })).toBeInTheDocument()
  })

  it('shows the error when the assistant is down', async () => {
    assistantApi.ask.mockRejectedValue(new Error('The assistant is not available right now. Try again in a minute.'))
    showPage()
    await userEvent.type(await screen.findByLabelText('Ask for jobs in your own words'), 'react{Enter}')
    expect(await screen.findByText(/not available right now/)).toBeInTheDocument()
  })
})
