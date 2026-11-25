import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataPage } from './DataPage'
import { trustApi } from '../services/TrustApi'

const auth = vi.hoisted(() => ({ forget: vi.fn() }))
const navigate = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (original) => ({ ...(await original()), useNavigate: () => navigate }))
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 's1', fullName: 'Salma Ali', role: 'seeker' }, forget: auth.forget }),
}))
vi.mock('../services/TrustApi', async (original) => ({
  ...(await original()),
  trustApi: { dataSummary: vi.fn(), downloadData: vi.fn(), deleteAccount: vi.fn() },
}))

const COUNTS = { cv: 1, aiTurns: 4, swipes: 12, matches: 2, messages: 9, jobs: 0, reviewsWritten: 1, tickets: 1, warnings: 0, files: 1 }

function renderPage() {
  render(
    <MemoryRouter>
      <DataPage />
    </MemoryRouter>,
  )
}

describe('Your data (FR-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    trustApi.dataSummary.mockResolvedValue(COUNTS)
  })

  it('lists what is kept, with the seeker rows only', async () => {
    renderPage()
    const row = (await screen.findByText('Swipes')).closest('li')
    expect(row).toHaveTextContent('12')
    expect(screen.getByText('Ask wuzzufny').closest('li')).toHaveTextContent('4')
    expect(screen.queryByText('Jobs')).not.toBeInTheDocument()
  })

  it('downloads one JSON file', async () => {
    trustApi.downloadData.mockResolvedValue(new Blob(['{}']))
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Download my data' }))
    expect(trustApi.downloadData).toHaveBeenCalled()
    expect(await screen.findByText('Downloaded wuzzufny-my-data.json')).toBeInTheDocument()
  })

  it('asks for the password, shows a wrong one, then deletes and logs out', async () => {
    trustApi.deleteAccount.mockRejectedValueOnce(new Error('That password is not right')).mockResolvedValue(null)
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete your account?' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete for good' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Type your password')

    await userEvent.type(within(dialog).getByLabelText('Password'), 'wrong')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete for good' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('That password is not right')
    expect(auth.forget).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete for good' }))
    expect(trustApi.deleteAccount).toHaveBeenLastCalledWith('wrong')
    expect(auth.forget).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('Cancel closes the dialog', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trustApi.deleteAccount).not.toHaveBeenCalled()
  })
})
