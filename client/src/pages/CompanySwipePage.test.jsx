import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CompanySwipePage } from './CompanySwipePage'
import { jobApi } from '../services/JobApi'
import { swipeApi } from '../services/SwipeApi'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'c1', fullName: 'Nile HR', companyName: 'Nile Tech', role: 'company' } }),
}))
vi.mock('../services/SwipeApi', () => ({
  swipeApi: { candidates: vi.fn(), swipe: vi.fn(), matches: vi.fn() },
}))
vi.mock('../services/JobApi', () => ({ jobApi: { listMine: vi.fn() } }))

const job = { id: 'j1', title: 'Junior Frontend Developer', salaryMin: 14000, salaryMax: 18000, workMode: 'hybrid', city: 'Maadi', status: 'live' }

function seeker(id, fullName, spamReasons = []) {
  return { id, fullName, headline: 'Fresh grad', city: 'Nasr City', isVerified: true, fit: 88, whyItFits: ['React'], missingSkills: ['TypeScript'], spamReasons }
}

function showPage() {
  render(
    <MemoryRouter>
      <CompanySwipePage />
    </MemoryRouter>,
  )
}

describe('H9 Company swipes candidates', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    jobApi.listMine.mockResolvedValue([job])
    swipeApi.matches.mockResolvedValue([])
    swipeApi.candidates.mockResolvedValue({
      job,
      candidates: [seeker('s1', 'Omar Hassan'), seeker('s2', 'Nour Adel')],
      checkLater: [seeker('s3', 'Spam Account', ['Not verified', 'Empty profile'])],
    })
  })

  it('shows a short name, the CV match and both tab counts', async () => {
    showPage()
    expect(await screen.findByRole('heading', { name: /Omar H\./ })).toBeInTheDocument()
    expect(screen.getByText('88%')).toBeInTheDocument()
    expect(screen.getByText('TypeScript · missing')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'To review (2)' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Check later (1)' })).not.toBeChecked()
  })

  it('→ says Interested in this seeker for this job', async () => {
    swipeApi.swipe.mockResolvedValue({ match: null })
    showPage()
    await screen.findByRole('heading', { name: /Omar H\./ })

    await userEvent.keyboard('{ArrowRight}')

    expect(swipeApi.swipe).toHaveBeenCalledWith({ jobId: 'j1', seekerId: 's1', interested: true })
    expect(await screen.findByRole('heading', { name: /Nour A\./ })).toBeInTheDocument()
  })

  it('"Check later" shows why each person was moved aside', async () => {
    showPage()
    await screen.findByRole('heading', { name: /Omar H\./ })

    await userEvent.click(screen.getByRole('radio', { name: 'Check later (1)' }))

    expect(screen.getByRole('heading', { name: /Spam A\./ })).toBeInTheDocument()
    expect(screen.getByText('Moved aside because: Not verified · Empty profile')).toBeInTheDocument()
  })

  it('asks a company with no jobs to post one first', async () => {
    jobApi.listMine.mockResolvedValue([])
    showPage()
    expect(await screen.findByRole('button', { name: 'Post a job' })).toBeInTheDocument()
  })
})
