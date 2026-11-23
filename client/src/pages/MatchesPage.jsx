import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { BookInterviewDialog } from '../components/BookInterviewDialog'
import { ChatPanel } from '../components/ChatPanel'
import { CloseMatchDialog } from '../components/CloseMatchDialog'
import { MatchDetails } from '../components/MatchDetails'
import { MatchList } from '../components/MatchList'
import { useAuth } from '../context/AuthContext'
import { liveSocket } from '../services/LiveSocket'
import { matchApi } from '../services/MatchApi'
import { displayName, shortName } from '../services/format'
import './MatchesPage.css'

// H4 "Matches + chat" for seekers and companies, with H5 "Book an interview" for companies.
// The page loads through MatchApi and listens to LiveSocket; it never talks to fetch or Socket.io itself.
export function MatchesPage() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()

  const [matches, setMatches] = useState([])
  const [listLoaded, setListLoaded] = useState(false)
  const [tab, setTab] = useState('active')
  // the open match and its messages remember which id they belong to, so a slow answer
  // for an old match never shows up under a new one
  const [detail, setDetail] = useState({ forId: null, data: null, error: '' })
  const [chat, setChat] = useState({ forId: null, list: [] })
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [actionError, setActionError] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const openId = useRef(id)

  const loadList = useCallback(() => {
    return matchApi.list().then((found) => {
      setMatches(found)
      setListLoaded(true)
    })
  }, [])

  const loadDetail = useCallback((matchId) => {
    return matchApi
      .get(matchId)
      .then((data) => setDetail({ forId: matchId, data, error: '' }))
      .catch((error) => setDetail({ forId: matchId, data: null, error: error.message }))
  }, [])

  const loadMessages = useCallback((matchId) => {
    return matchApi.messages(matchId).then((list) => setChat({ forId: matchId, list })).catch(() => {})
  }, [])

  // The list once; the open match whenever the address changes
  useEffect(() => {
    loadList().catch(() => setListLoaded(true))
  }, [loadList])

  useEffect(() => {
    openId.current = id
    if (!id) return undefined
    loadDetail(id)
    loadMessages(id)
    liveSocket.joinMatch(id)
    return () => liveSocket.leaveMatch(id)
  }, [id, loadDetail, loadMessages])

  // On a wide screen, open the newest active match straight away, like the Figma frame
  useEffect(() => {
    if (id || !listLoaded) return
    const first = matches.find((m) => m.status !== 'closed')
    const wide = typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 768px)').matches
    if (first && wide) navigate(`/matches/${first.id}`, { replace: true })
  }, [id, listLoaded, matches, navigate])

  // Live events (FR-22): reload whatever changed
  useEffect(() => {
    const stops = [
      liveSocket.on('message:new', ({ matchId }) => {
        loadList()
        if (matchId === openId.current) loadMessages(matchId)
      }),
      liveSocket.on('match:status', ({ matchId }) => {
        loadList()
        if (matchId === openId.current) loadDetail(matchId)
      }),
      liveSocket.on('match:new', () => loadList()),
      liveSocket.on('notice:new', ({ text }) => setToast(text)),
    ]
    return () => stops.forEach((stop) => stop())
  }, [loadList, loadDetail, loadMessages])

  const match = detail.forId === id ? detail.data : null
  const messages = chat.forId === id ? chat.list : []
  const side = user.role === 'company' ? 'company' : 'seeker'
  const other = match?.with || { name: 'Deleted user' }
  const names = {
    company: side === 'seeker' ? other.name : displayName(user),
    seeker: side === 'company' ? other.name.split(' ')[0] : user.fullName.split(' ')[0],
    other: other.name,
    job: match?.job?.title || 'the job',
  }
  const withText = `with ${side === 'company' ? shortName(other.name) : other.name} · ${names.job}`
  const otherFirstName = side === 'company' ? names.seeker : names.company

  async function refresh() {
    await Promise.all([loadDetail(id), loadMessages(id), loadList()])
  }

  // Runs one change, shows its error if it fails, then reloads the match
  async function act(change) {
    setBusy(true)
    setActionError('')
    try {
      await change()
      await refresh()
    } catch (error) {
      setActionError(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function finishDialog(change) {
    await change()
    setDialog(null)
    await refresh()
  }

  const actions = {
    bookInterview: () => setDialog({ kind: 'book' }),
    // FR-25: open the room at once (pop-up blockers allow it only straight after the click),
    // then tell the other side with a card in the chat
    startCall: () => {
      window.open(match.callLink, '_blank', 'noopener')
      act(() => matchApi.startCall(id))
    },
    accept: (interview) => act(() => matchApi.accept(interview.id)),
    askNewTime: (interview) => setDialog({ kind: 'ask', interview }),
    takeTime: (interview) => act(() => matchApi.reschedule(interview.id, interview.requestedTime)),
    suggestTime: (interview) => setDialog({ kind: 'suggest', interview }),
  }

  async function send(text) {
    await matchApi.send(id, text)
    await Promise.all([loadMessages(id), loadList()])
  }

  const newMatches = matches.filter((m) => m.status === 'matched').length

  return (
    <AppLayout flush newMatches={newMatches}>
      <div className={`matches-page${id ? ' matches-page--open' : ''}`}>
        <MatchList matches={matches} side={side} selectedId={id} tab={tab} onTab={setTab} />

        {match ? (
          <>
            <ChatPanel
              match={match}
              messages={messages}
              me={user.id}
              names={names}
              actions={actions}
              busy={busy}
              onSend={send}
              onToggleDetails={() => setDetailsOpen((open) => !open)}
            />
            <MatchDetails
              match={match}
              names={names}
              busy={busy}
              open={detailsOpen}
              onClose={() => setDialog({ kind: 'close' })}
              onMoveStatus={(status) => act(() => matchApi.moveStatus(id, status))}
            />
          </>
        ) : (
          <div className="matches-page__empty">
            <p>{detail.forId === id && detail.error ? detail.error : id ? 'Loading the chat…' : 'Pick a match to see the chat.'}</p>
          </div>
        )}
      </div>

      {(toast || actionError) && (
        <div className={`toast${actionError ? ' toast--error' : ''}`} role={actionError ? 'alert' : 'status'}>
          <span>{actionError || toast}</span>
          <button
            type="button"
            className="toast__close"
            onClick={() => {
              setToast('')
              setActionError('')
            }}
          >
            OK
          </button>
        </div>
      )}

      {dialog?.kind === 'book' && (
        <BookInterviewDialog
          mode="book"
          matchId={id}
          withText={withText}
          otherFirstName={otherFirstName}
          onCancel={() => setDialog(null)}
          onSubmit={(details) => finishDialog(() => matchApi.book(id, details))}
        />
      )}
      {(dialog?.kind === 'ask' || dialog?.kind === 'suggest') && (
        <BookInterviewDialog
          mode={dialog.kind}
          matchId={id}
          withText={withText}
          otherFirstName={otherFirstName}
          onCancel={() => setDialog(null)}
          onSubmit={(time) =>
            finishDialog(() =>
              dialog.kind === 'ask' ? matchApi.askNewTime(dialog.interview.id, time) : matchApi.reschedule(dialog.interview.id, time),
            )
          }
        />
      )}
      {dialog?.kind === 'close' && (
        <CloseMatchDialog
          side={side}
          otherName={side === 'company' ? shortName(other.name) : other.name}
          jobTitle={names.job}
          onCancel={() => setDialog(null)}
          onSubmit={(reason) => finishDialog(() => matchApi.close(id, reason))}
        />
      )}
    </AppLayout>
  )
}
