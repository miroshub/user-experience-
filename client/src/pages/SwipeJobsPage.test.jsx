import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SwipeJobsPage } from './SwipeJobsPage'
import { swipeApi } from '../services/SwipeApi'

// The page gets a fake logged-in seeker and a fake API, so no server is needed
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 's1', fullName: 'Salma Ali', role: 'seeker' } }),
}))
vi.mock('../services/SwipeApi', () => ({
  swipeApi: { jobCards: vi.fn(), swipe: vi.fn(), undo: vi.fn(), matches: vi.fn() },
}))

function card(id, title, company) {
  return {
    id,
    title,
    salaryMin: 14000,
    salaryMax: 18000,
    workMode: 'hybrid',
    city: 'Maadi',
    description: 'A small team.',
    fit: 82,
    whyItFits: ['React'],
    missingSkills: ['TypeScript'],
    company: { id: 'c1', name: company, isVerified: true, location: 'Cairo' },
  }
}

function showPage() {
  render(
    <MemoryRouter>
      <SwipeJobsPage />
    </MemoryRouter>,
  )
}

describe('H2 Swipe jobs', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    swipeApi.jobCards.mockResolvedValue([card('j1', 'Junior Frontend Developer', 'Nile Byte'), card('j2', 'QA Tester', 'Delta Bank')])
    swipeApi.matches.mockResolvedValue([])
  })

  it('shows the top card with its fit, reasons and missing skills', async () => {
    showPage()
    expect(await screen.findByRole('heading', { name: 'Junior Frontend Developer' })).toBeInTheDocument()
    expect(screen.getByText('82% fit')).toBeInTheDocument()
    expect(screen.getByText('React ✓')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('→ says Interested and opens "It\'s a match" when both said yes', async () => {
    swipeApi.swipe.mockResolvedValue({ match: { id: 'm1' } })
    showPage()
    await screen.findByRole('heading', { name: 'Junior Frontend Developer' })

    await userEvent.keyboard('{ArrowRight}')

    expect(swipeApi.swipe).toHaveBeenCalledWith({ jobId: 'j1', interested: true })
    const dialog = await screen.findByRole('dialog', { name: 'It’s a match' })
    expect(dialog).toHaveTextContent('You and Nile Byte both want to talk about Junior Frontend Developer.')

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('← skips, then Z brings the same card back', async () => {
    swipeApi.swipe.mockResolvedValue({ match: null })
    swipeApi.undo.mockResolvedValue({ id: 'j1', title: 'Junior Frontend Developer' })
    showPage()
    await screen.findByRole('heading', { name: 'Junior Frontend Developer' })

    await userEvent.keyboard('{ArrowLeft}')
    expect(swipeApi.swipe).toHaveBeenCalledWith({ jobId: 'j1', interested: false })
    expect(await screen.findByRole('heading', { name: 'QA Tester' })).toBeInTheDocument()

    await userEvent.keyboard('z')
    expect(await screen.findByRole('heading', { name: 'Junior Frontend Developer' })).toBeInTheDocument()
    expect(screen.getByText('Nile Byte')).toBeInTheDocument() // the full card, not just the job
  })

  it('puts the card back and explains why when the server refuses', async () => {
    const error = Object.assign(new Error("Please verify your ID before saying you're interested"), {
      code: 'VERIFY_REQUIRED',
    })
    swipeApi.swipe.mockRejectedValue(error)
    showPage()
    await screen.findByRole('heading', { name: 'Junior Frontend Developer' })

    await userEvent.click(screen.getByRole('button', { name: 'Interested' }))

    expect(await screen.findByText(/verify your ID/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Verify my ID' })).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('heading', { name: 'Junior Frontend Developer' })).toBeInTheDocument()
  })

  it('ignores the arrow keys while the user types in a filter box', async () => {
    showPage()
    await screen.findByRole('heading', { name: 'Junior Frontend Developer' })
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))

    await userEvent.type(screen.getByLabelText('City'), 'Cairo{ArrowLeft}')

    expect(swipeApi.swipe).not.toHaveBeenCalled()
  })

  it('sends the chosen filters and shows them as chips', async () => {
    showPage()
    await screen.findByRole('heading', { name: 'Junior Frontend Developer' })
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.type(screen.getByLabelText('City'), 'Cairo')
    await userEvent.click(screen.getByRole('button', { name: 'Show jobs' }))

    await waitFor(() => expect(swipeApi.jobCards).toHaveBeenLastCalledWith({ city: 'Cairo' }))
    expect(screen.getByRole('button', { name: 'Remove filter Cairo' })).toBeInTheDocument()
  })
})
