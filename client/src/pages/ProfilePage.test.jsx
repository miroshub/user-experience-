import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfilePage } from './ProfilePage'
import { trustApi } from '../services/TrustApi'

const auth = vi.hoisted(() => ({ replaceUser: vi.fn(), logOut: vi.fn() }))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 's1', fullName: 'Salma Adel', role: 'seeker', headline: 'Frontend', city: 'Cairo',
      isVerified: true, verifiedAt: '2026-10-12T09:00:00Z', skills: ['React'],
    },
    replaceUser: auth.replaceUser,
    logOut: auth.logOut,
  }),
}))
vi.mock('../services/TrustApi', async (original) => ({
  ...(await original()),
  trustApi: { overview: vi.fn(), contactSupport: vi.fn(), updateProfile: vi.fn() },
}))
vi.mock('../services/SwipeApi', () => ({ swipeApi: { matches: vi.fn().mockResolvedValue([]) } }))
vi.mock('../services/AssistantApi', () => ({
  assistantApi: { open: vi.fn().mockResolvedValue({ filters: { role: 'Frontend developer', places: ['Cairo', 'Remote'], minPay: 12000 } }) },
}))

const REPLY = 'A real person replies in under 24 hours'

function overview(changes = {}) {
  return { health: 'good', openWarning: null, warnings: [], tickets: [], replyPromise: REPLY, ...changes }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  )
}

describe('H8 Profile + Trust centre', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('shows the profile, the verified-once line and "all good" (FR-04, FR-07)', async () => {
    trustApi.overview.mockResolvedValue(overview())
    renderPage()
    expect(screen.getByRole('heading', { name: 'Salma Adel' })).toBeInTheDocument()
    expect(screen.getByText('Frontend · Cairo · Open to work')).toBeInTheDocument()
    expect(screen.getByText('Verified once on 12 Oct. You won’t be asked again.')).toBeInTheDocument()
    expect(await screen.findByText('Account health: all good')).toBeInTheDocument()
    expect(screen.getByText('None so far')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Your data/ })).toHaveAttribute('href', '/profile/data')
  })

  it('shows what the seeker asked for in Ask wuzzufny', async () => {
    trustApi.overview.mockResolvedValue(overview())
    renderPage()
    expect(await screen.findByText('Frontend developer')).toBeInTheDocument()
    expect(screen.getByText('12k+ EGP / month')).toBeInTheDocument()
    expect(screen.getByText('Remote')).toBeInTheDocument()
  })

  it('shows an open warning with its reason and fix-by date, and the history', async () => {
    const warning = { id: 'w1', reason: 'Profile photo is not you', status: 'open', daysLeft: 5, deadline: '2026-11-30T10:00:00Z', createdAt: '2026-11-23T10:00:00Z' }
    trustApi.overview.mockResolvedValue(overview({ health: 'warning', openWarning: warning, warnings: [warning] }))
    renderPage()
    expect(await screen.findByText('Account health: one thing to fix')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Profile photo is not you. Please fix it by 30 Nov (5 days left)')

    await userEvent.click(screen.getByRole('button', { name: /Warning history/ }))
    const history = screen.getByRole('list', { name: 'Warning history' })
    expect(within(history).getByText('Open · sent 23 Nov · fix by 30 Nov')).toBeInTheDocument()
  })

  it('sends a support ticket and lists it with the reply promise (FR-06)', async () => {
    trustApi.overview.mockResolvedValue(overview())
    trustApi.contactSupport.mockResolvedValue({
      id: 't1', topic: 'Account', message: 'Help me', status: 'open', reply: null, createdAt: '2026-11-25T10:00:00Z', replyPromise: REPLY,
    })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Talk to support/ }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Pick a topic')

    await userEvent.click(within(dialog).getByRole('radio', { name: 'Account' }))
    await userEvent.type(within(dialog).getByLabelText('Your message'), 'Help me')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send' }))

    expect(trustApi.contactSupport).toHaveBeenCalledWith({ topic: 'Account', message: 'Help me' })
    expect(await screen.findByText(`Sent. ${REPLY}.`)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Your messages to support' })).toHaveTextContent('Waiting for a reply')
  })

  it('shows the support reply in the Trust centre (FR-37)', async () => {
    trustApi.overview.mockResolvedValue(overview({
      tickets: [{ id: 't1', topic: 'A warning', message: 'It is me', status: 'closed', reply: 'Thanks, removed', createdAt: '2026-11-20T10:00:00Z' }],
    }))
    renderPage()
    expect(await screen.findByText('Thanks, removed')).toBeInTheDocument()
  })

  it('edits the profile and updates the logged-in user', async () => {
    trustApi.overview.mockResolvedValue(overview())
    trustApi.updateProfile.mockResolvedValue({ id: 's1', fullName: 'Salma A.', role: 'seeker' })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
    const city = screen.getByLabelText('City')
    await userEvent.clear(city)
    await userEvent.type(city, 'Giza')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(trustApi.updateProfile).toHaveBeenCalledWith({ fullName: 'Salma Adel', headline: 'Frontend', city: 'Giza' })
    await waitFor(() => expect(auth.replaceUser).toHaveBeenCalled())
  })

  it('notification switches flip and are remembered', async () => {
    trustApi.overview.mockResolvedValue(overview())
    renderPage()
    const tips = screen.getByRole('switch', { name: 'Weekly CV tips' })
    expect(tips).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(tips)
    expect(tips).toHaveAttribute('aria-checked', 'true')
    expect(JSON.parse(localStorage.getItem('wuzzufny.notifications')).cvTips).toBe(true)
  })

  it('logs out', async () => {
    trustApi.overview.mockResolvedValue(overview())
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(auth.logOut).toHaveBeenCalled()
  })
})
