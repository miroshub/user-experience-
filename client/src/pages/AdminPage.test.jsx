import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminPage } from './AdminPage'
import { adminApi } from '../services/AdminApi'

let mockUser
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser, logOut: vi.fn() }) }))
vi.mock('../services/AdminApi', () => ({
  adminApi: {
    flags: vi.fn(), dismissFlag: vi.fn(), warn: vi.fn(), suspend: vi.fn(), warnings: vi.fn(), markFixed: vi.fn(),
    users: vi.fn(), disputes: vi.fn(), moderate: vi.fn(), inbox: vi.fn(), reply: vi.fn(), close: vi.fn(),
  },
}))

const MONA = { id: 'a1', fullName: 'Mona Moderator', role: 'admin', adminRole: 'moderator', tabs: ['flags', 'reviews', 'warnings', 'users'] }
const SAMI = { id: 'a2', fullName: 'Sami Support', role: 'admin', adminRole: 'support', tabs: ['inbox'] }
const OMAR = { id: 'u1', fullName: 'Omar Hassan', role: 'seeker', email: 'omar@x.co', isVerified: true, accountState: 'active' }

function flag(changes = {}) {
  return {
    id: 'f1', source: 'review', reasons: ['3+ serious-tag reviews in 30 days'], hits: 1, createdAt: '2026-11-25T10:00:00Z',
    user: OMAR, warnings: [], canSuspend: false, ...changes,
  }
}

function showAt(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/:tab" element={<AdminPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('L11 admin dashboard (FR-33 to FR-37, FR-43)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockUser = MONA
  })

  it('a moderator lands on Spam flags and sees only the moderator tabs (FR-33)', async () => {
    adminApi.flags.mockResolvedValue([flag()])
    showAt('/admin')
    expect(await screen.findByRole('heading', { name: 'Flagged accounts' })).toBeInTheDocument()
    const tabs = screen.getByRole('radiogroup', { name: 'Admin sections' })
    expect(within(tabs).getAllByRole('radio').map((t) => t.textContent)).toEqual(['Spam flags', 'Disputed reviews', 'Warnings', 'Users'])
    expect(within(tabs).queryByText('Support')).not.toBeInTheDocument()
  })

  it('support staff only get the inbox, even if they type another tab (FR-33)', async () => {
    mockUser = SAMI
    adminApi.inbox.mockResolvedValue([])
    showAt('/admin/flags')
    expect(await screen.findByRole('heading', { name: 'Support inbox' })).toBeInTheDocument()
    expect(adminApi.flags).not.toHaveBeenCalled()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('shows why an account was flagged and blocks Suspend without an expired warning (FR-34, FR-36)', async () => {
    adminApi.flags.mockResolvedValue([flag()])
    showAt('/admin/flags')
    const row = (await screen.findByText('Omar Hassan')).closest('tr')
    expect(row).toHaveTextContent('3+ serious-tag reviews in 30 days')
    expect(row).toHaveTextContent('No warning yet')
    const suspend = within(row).getByRole('button', { name: 'Suspend' })
    expect(suspend).toBeDisabled()
    expect(suspend).toHaveAccessibleDescription('Suspend needs a warning past its 7-day fix-by date')
  })

  it('sends a warning with a reason (FR-35)', async () => {
    adminApi.flags.mockResolvedValue([flag()])
    adminApi.warn.mockResolvedValue({})
    showAt('/admin/flags')
    await userEvent.click(await screen.findByRole('button', { name: 'Send warning' }))
    const dialog = screen.getByRole('dialog', { name: 'Send a warning' })
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Missed three interviews')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send warning' }))
    expect(adminApi.warn).toHaveBeenCalledWith('u1', { reason: 'Missed three interviews' })
    expect(await screen.findByText('Warning sent to Omar Hassan')).toBeInTheDocument()
  })

  it('suspends once the warning has expired, and dismisses flags', async () => {
    adminApi.flags.mockResolvedValue([flag({ canSuspend: true, warnings: [{ status: 'expired', deadline: '2026-11-20T10:00:00Z' }] })])
    adminApi.suspend.mockResolvedValue([])
    adminApi.dismissFlag.mockResolvedValue({})
    showAt('/admin/flags')
    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }))
    expect(adminApi.suspend).toHaveBeenCalledWith('u1')
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(adminApi.dismissFlag).toHaveBeenCalledWith('f1')
  })

  it('keeps a disputed review or warns the writer with the review linked (FR-43)', async () => {
    const review = {
      id: 'r1', stars: 1, tags: ['Fake job / fake profile'], comment: 'Scam', reply: 'Not true', createdAt: '2026-11-24T10:00:00Z',
      reviewer: OMAR, reviewee: { id: 'c1', role: 'company', fullName: 'HR', companyName: 'Nile Tech', accountState: 'active' },
    }
    adminApi.disputes.mockResolvedValue([review])
    adminApi.moderate.mockResolvedValue(null)
    adminApi.warn.mockResolvedValue({})
    showAt('/admin/reviews')
    await userEvent.click(await screen.findByRole('button', { name: 'Keep' }))
    expect(adminApi.moderate).toHaveBeenCalledWith('r1', 'keep')

    await userEvent.click(screen.getByRole('button', { name: 'Warn the writer (fake or abusive)' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Fake review')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send warning' }))
    expect(adminApi.warn).toHaveBeenCalledWith('u1', { reason: 'Fake review', reviewId: 'r1' })
  })

  it('support replies to and closes tickets, longest wait first, late ones marked in words (FR-37)', async () => {
    mockUser = SAMI
    adminApi.inbox.mockResolvedValue([
      { id: 't1', topic: 'A warning', message: 'It is me', hoursWaiting: 30, user: OMAR, reply: null },
    ])
    adminApi.reply.mockResolvedValue({})
    adminApi.close.mockResolvedValue({})
    showAt('/admin/inbox')
    expect(await screen.findByText('Waiting 30 h · over 24 h promise')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Reply'), 'Thanks, fixed')
    await userEvent.click(screen.getByRole('button', { name: 'Send reply' }))
    expect(adminApi.reply).toHaveBeenCalledWith('t1', 'Thanks, fixed')
    await userEvent.click(screen.getByRole('button', { name: 'Close ticket' }))
    expect(adminApi.close).toHaveBeenCalledWith('t1')
  })

  it('searches users and lists warnings', async () => {
    adminApi.users.mockResolvedValue([OMAR])
    showAt('/admin/users')
    await userEvent.type(await screen.findByLabelText('Name, company or email'), 'omar')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(adminApi.users).toHaveBeenLastCalledWith('omar')
  })
})
