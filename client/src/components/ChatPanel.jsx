import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { dayText } from '../services/format'
import { Avatar } from './Avatar'
import { InterviewCard, NoticeLine, TestCard } from './ChatCards'
import { Icon } from './Icon'

const BADGES = { interview: 'Interview booked', offer: 'Offer made', hired: 'Hired', closed: 'Closed' }

// H4 middle column: who you are talking to, the chat, the action chips and the message box
export function ChatPanel({ match, messages, me, names, actions, onSend, onToggleDetails, busy }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const threadRef = useRef(null)
  const side = match.mySide
  const other = match.with || { name: 'Deleted user', role: side === 'seeker' ? 'company' : 'seeker' }
  const closed = match.status === 'closed'

  // New messages appear at the bottom, so keep the newest in view
  useEffect(() => {
    const thread = threadRef.current
    if (thread) thread.scrollTop = thread.scrollHeight
  }, [messages.length])

  async function handleSubmit(event) {
    event.preventDefault()
    if (text.trim() === '' || sending) return
    setSending(true)
    setError('')
    try {
      await onSend(text)
      setText('')
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setSending(false)
    }
  }

  const subtitle = side === 'seeker'
    ? [match.job?.title, other.contactName && `${other.contactName}, hiring`].filter(Boolean).join(' · ')
    : [match.job?.title, other.city].filter(Boolean).join(' · ')

  return (
    <section className="chat" aria-label={`Chat with ${other.name}`}>
      <header className="chat__head">
        <Link to="/matches" className="chat__back" aria-label="Back to matches">
          <Icon name="back" />
        </Link>
        <Avatar name={other.name} id={other.id} role={other.role} />
        <div className="chat__who">
          <h2 className="chat__name">{other.name}</h2>
          <p className="chat__sub">{subtitle}</p>
        </div>
        {BADGES[match.status] && <span className={`chat__badge chat__badge--${match.status}`}>{BADGES[match.status]}</span>}
        <button type="button" className="chat__details" onClick={onToggleDetails}>
          Details
        </button>
      </header>

      <div className="chat__thread" ref={threadRef} role="log" aria-live="polite" aria-label="Messages">
        <p className="chat__overline">MATCHED · {dayText(match.matchedAt).toUpperCase()}</p>
        {messages.length === 0 && !closed && (
          <p className="chat__empty">You both said yes. Say hi and ask your first question.</p>
        )}
        {messages.map((message, i) => (
          <ChatItem
            key={message.id}
            message={message}
            previous={messages[i - 1]}
            match={match}
            me={me}
            names={names}
            actions={actions}
            busy={busy}
          />
        ))}
      </div>

      <footer className="chat__compose">
        {closed ? (
          <p className="chat__closed">
            This match is closed. Reason: {match.closeReason}
          </p>
        ) : (
          <>
            <div className="chat__tools">
              {side === 'company' && (
                <button type="button" className="chat__tool" onClick={actions.bookInterview}>
                  <Icon name="calendar-dark" />
                  Book interview
                </button>
              )}
              <button type="button" className="chat__tool" onClick={actions.startCall}>
                <Icon name="video" />
                Video call
              </button>
              {side === 'company' && (
                <button type="button" className="chat__tool" disabled title="The test builder comes in with its sketch">
                  <Icon name="timer-small" />
                  Quick test
                </button>
              )}
            </div>
            <form className="chat__form" onSubmit={handleSubmit}>
              <label className="visually-hidden" htmlFor="chat-input">
                Message
              </label>
              <input
                id="chat-input"
                className="chat__input"
                placeholder="Write a message"
                autoComplete="off"
                maxLength={1000}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <button type="submit" className="chat__send" aria-label="Send" disabled={sending || text.trim() === ''}>
                <Icon name="send" />
              </button>
            </form>
            {error && (
              <p className="chat__error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </footer>
    </section>
  )
}

function ChatItem({ message, previous, match, me, names, actions, busy }) {
  const newDay = previous && dayText(previous.sentAt) !== dayText(message.sentAt)
  const dayLine = newDay && <p className="chat__overline">{dayText(message.sentAt).toUpperCase()}</p>
  const interview = message.interviewId && match.interviews.find((i) => i.id === message.interviewId)

  let body
  if (message.kind === 'text') {
    const mine = message.sender === me
    body = (
      <p className={`bubble bubble--${mine ? 'mine' : 'theirs'}`}>
        <span className="visually-hidden">{mine ? 'You: ' : `${names.other}: `}</span>
        {message.text}
      </p>
    )
  } else if (message.kind === 'interview' && interview) {
    body = (
      <InterviewCard
        interview={interview}
        side={match.mySide}
        names={names}
        busy={busy}
        onAccept={() => actions.accept(interview)}
        onAskNewTime={() => actions.askNewTime(interview)}
        onTakeTime={() => actions.takeTime(interview)}
        onSuggestTime={() => actions.suggestTime(interview)}
      />
    )
  } else if (message.kind === 'test' && interview) {
    body = <TestCard test={interview} side={match.mySide} />
  } else {
    body = <NoticeLine message={message} callLink={match.callLink} />
  }

  return (
    <>
      {dayLine}
      {body}
    </>
  )
}
