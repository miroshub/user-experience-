import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MatchesPage } from './MatchesPage'
import { matchApi } from '../services/MatchApi'
import { reviewApi } from '../services/ReviewApi'

let mockUser
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }))
vi.mock('../services/MatchApi', () => ({
  matchApi: {
    list: vi.fn(), get: vi.fn(), messages: vi.fn(), send: vi.fn(), startCall: vi.fn(), slots: vi.fn(),
    book: vi.fn(), accept: vi.fn(), askNewTime: vi.fn(), reschedule: vi.fn(), moveStatus: vi.fn(), close: vi.fn(),
  },
}))
vi.mock('../services/ReviewApi', async (original) => ({
  ...(await original()),
  reviewApi: { forMatch: vi.fn(), submit: vi.fn(), reply: vi.fn(), dispute: vi.fn() },
}))
vi.mock('../services/LiveSocket', () => ({
  liveSocket: { on: vi.fn(() => () => {}), joinMatch: vi.fn(), leaveMatch: vi.fn() },
}))

const SALMA = { id: 's1', fullName: 'Salma Ali', role: 'seeker' }
const NILE = { id: 'c1', fullName: 'Mona Adel', companyName: 'Nile Tech', role: 'company' }
const job = { id: 'j1', title: 'Junior Frontend Developer', salaryMin: 14000, salaryMax: 18000, workMode: 'hybrid', city: 'Maadi' }
// Sun 22 Nov 2026, 11:00 in Cairo
const SLOT = '2026-11-22T09:00:00.000Z'

function aMatch(side, changes = {}) {
  const withWho = side === 'seeker'
    ? { id: 'c1', role: 'company', name: 'Nile Tech', contactName: 'Mona Adel', location: 'Cairo' }
    : { id: 's1', role: 'seeker', name: 'Salma Ali', city: 'Nasr City' }
  return {
    id: 'm1', status: 'chatting', matchedAt: '2026-11-15T10:00:00Z', lastActivity: '2026-11-16T10:00:00Z',
    lastActor: 'company', quietDays: 1, isWaiting: false, stepDates: { matched: '2026-11-15T10:00:00Z', chatting: '2026-11-16T10:00:00Z' },
    job, with: withWho, interviews: [], callLink: 'https://meet.jit.si/wuzzufny-abc', mySide: side, ...changes,
  }
}

function showPage() {
  render(
    <MemoryRouter initialEntries={['/matches/m1']}>
      <Routes>
        <Route path="/matches/:id" element={<MatchesPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('H4 Matches + chat', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockUser = SALMA
    matchApi.list.mockResolvedValue([aMatch('seeker')])
    matchApi.get.mockResolvedValue(aMatch('seeker'))
    matchApi.messages.mockResolvedValue([
      { id: 'x1', sender: 'c1', kind: 'text', text: 'Hi Salma!', sentAt: '2026-11-16T10:00:00Z' },
    ])
    matchApi.slots.mockResolvedValue([SLOT, '2026-11-22T11:00:00.000Z'])
    reviewApi.forMatch.mockResolvedValue({ canReview: false, mine: null, theirs: null, theyReviewed: false })
  })

  it('shows the match list, the chat and the progress steps with words', async () => {
    showPage()
    const chat = await screen.findByRole('region', { name: 'Chat with Nile Tech' })
    expect(within(chat).getByText('Hi Salma!')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Active (1)' })).toBeChecked()
    expect(screen.getAllByText('Chatting · replied', { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getByText('Chatting', { selector: '.step__label' })).toHaveTextContent('Chatting (now)')
    expect(screen.getByText('EGP 14k–18k / month')).toBeInTheDocument()
  })

  it('FR-22: sends a message and clears the box', async () => {
    matchApi.send.mockResolvedValue({ id: 'x2' })
    showPage()
    const box = await screen.findByLabelText('Message')

    await userEvent.type(box, 'See you Sunday{Enter}')

    expect(matchApi.send).toHaveBeenCalledWith('m1', 'See you Sunday')
    expect(box).toHaveValue('')
  })

  it('FR-24: the seeker accepts an invite from its card', async () => {
    const invite = { id: 'i1', type: 'video', status: 'invited', dateTime: SLOT, link: 'https://meet.jit.si/wuzzufny-abc', note: '' }
    matchApi.get.mockResolvedValue(aMatch('seeker', { status: 'interview', interviews: [invite] }))
    matchApi.messages.mockResolvedValue([{ id: 'x3', sender: 'system', kind: 'interview', text: 'Interview booked', interviewId: 'i1', sentAt: '2026-11-16T10:00:00Z' }])
    matchApi.accept.mockResolvedValue({ ...invite, status: 'confirmed' })
    showPage()

    const card = await screen.findByRole('article', { name: 'Interview booked' })
    expect(within(card).getByText('Sun 22 Nov · 11:00–11:30 · Video call in Wuzzufny')).toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: 'Accept' }))

    expect(matchApi.accept).toHaveBeenCalledWith('i1')
  })

  it('shows a closed match with its reason and no message box', async () => {
    matchApi.get.mockResolvedValue(aMatch('seeker', { status: 'closed', closeReason: 'Position filled', closedBy: 'company' }))
    showPage()
    expect(await screen.findByText('This match is closed. Reason: Position filled')).toBeInTheDocument()
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument()
  })
})

describe('H5 Book an interview (company)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockUser = NILE
    matchApi.list.mockResolvedValue([aMatch('company')])
    matchApi.get.mockResolvedValue(aMatch('company'))
    matchApi.messages.mockResolvedValue([])
    matchApi.slots.mockResolvedValue([SLOT, '2026-11-22T11:00:00.000Z'])
    reviewApi.forMatch.mockResolvedValue({ canReview: false, mine: null, theirs: null, theyReviewed: false })
  })

  it('FR-23: picks how, a day and a free Cairo time, then sends the invite', async () => {
    matchApi.book.mockResolvedValue({ id: 'i1' })
    showPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Book interview' }))

    const dialog = await screen.findByRole('dialog', { name: 'Book an interview' })
    expect(within(dialog).getByText('with Salma A. · Junior Frontend Developer')).toBeInTheDocument()
    expect(within(dialog).getByText('Salma gets the invite now and a reminder 1 hour before.')).toBeInTheDocument()
    await userEvent.click(await within(dialog).findByRole('radio', { name: '11:00' }))
    await userEvent.type(within(dialog).getByLabelText('Message (optional)'), 'Bring your project')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send invite' }))

    expect(matchApi.book).toHaveBeenCalledWith('m1', { type: 'video', dateTime: SLOT, note: 'Bring your project' })
  })

  it('Escape closes the dialog without booking', async () => {
    showPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Book interview' }))
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(matchApi.book).not.toHaveBeenCalled()
  })

  it('FR-29: closing needs a reason that the seeker will see', async () => {
    matchApi.close.mockResolvedValue({})
    showPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Close match' }))
    const dialog = await screen.findByRole('dialog', { name: 'Close this match' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'Close match' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Pick a reason')
    expect(matchApi.close).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole('radio', { name: 'Position filled' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close match' }))
    expect(matchApi.close).toHaveBeenCalledWith('m1', 'Position filled')
  })

  it('FR-27: the company moves the status bar forward', async () => {
    matchApi.moveStatus.mockResolvedValue({})
    matchApi.get.mockResolvedValue(aMatch('company', { status: 'interview' }))
    showPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Move to Offer →' }))
    expect(matchApi.moveStatus).toHaveBeenCalledWith('m1', 'offer')
  })
})
