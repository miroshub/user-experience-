import { downloadIcs } from '../services/calendar'
import { dayTimeText, meetingText } from '../services/format'
import { Button } from './Button'
import { Icon } from './Icon'

// The cards inside the H4 chat. They show the interview as it is *now*,
// so an invite that was accepted later shows "Join call" without a new card.

// FR-23, FR-24, FR-25: "Interview booked"
export function InterviewCard({ interview, side, names, onAccept, onAskNewTime, onTakeTime, onSuggestTime, busy }) {
  const isVideo = interview.type === 'video'
  const title = `Interview · ${names.job}`
  const where = isVideo ? interview.link : names.company

  return (
    <article className="chat-card chat-card--booked" aria-label="Interview booked">
      <p className="chat-card__head">
        <Icon name="calendar" />
        Interview booked
      </p>
      <p className="chat-card__meta">{meetingText(interview)}</p>
      {interview.note && <p className="chat-card__note">“{interview.note}”</p>}

      {interview.status === 'confirmed' && (
        <div className="chat-card__actions">
          {isVideo && (
            <a className="button button--primary button--md" href={interview.link} target="_blank" rel="noreferrer">
              Join call
            </a>
          )}
          <Button variant="secondary" onClick={() => downloadIcs(interview, title, where)}>
            Add to calendar
          </Button>
        </div>
      )}

      {interview.status === 'invited' && side === 'seeker' && (
        <div className="chat-card__actions">
          <Button onClick={onAccept} disabled={busy}>
            Accept
          </Button>
          <Button variant="secondary" onClick={onAskNewTime} disabled={busy}>
            Ask for another time
          </Button>
        </div>
      )}
      {interview.status === 'invited' && side === 'company' && (
        <p className="chat-card__state chat-card__state--pending">Sent · waiting for {names.seeker} to accept</p>
      )}

      {interview.status === 'new time asked' && side === 'company' && (
        <>
          <p className="chat-card__state chat-card__state--pending">
            {names.seeker} asked for {dayTimeText(interview.requestedTime)}
          </p>
          <div className="chat-card__actions">
            <Button onClick={onTakeTime} disabled={busy}>
              Take this time
            </Button>
            <Button variant="secondary" onClick={onSuggestTime} disabled={busy}>
              Suggest another time
            </Button>
          </div>
        </>
      )}
      {interview.status === 'new time asked' && side === 'seeker' && (
        <p className="chat-card__state chat-card__state--pending">
          You asked for {dayTimeText(interview.requestedTime)} · waiting for {names.company}
        </p>
      )}
    </article>
  )
}

// FR-26: "Quick test". Taking the test needs the student's sketch, so Start test waits for it.
export function TestCard({ test, side }) {
  const state = {
    sent: 'Sent · not started yet',
    started: 'Started · the timer is running',
    done: `Done · ${test.result}`,
  }[test.status]

  return (
    <article className="chat-card chat-card--test" aria-label="Quick test">
      <p className="chat-card__head">
        <Icon name="timer" />
        Quick test · {test.title}
      </p>
      <p className="chat-card__meta">
        {test.questionCount} question{test.questionCount === 1 ? '' : 's'} · {test.timeLimit} minutes
      </p>
      {side === 'seeker' && test.status !== 'done' ? (
        <div className="chat-card__actions">
          <Button disabled title="The test screen comes in with its sketch">
            Start test
          </Button>
        </div>
      ) : (
        <p className={`chat-card__state chat-card__state--${test.status === 'done' ? 'done' : 'pending'}`}>{state}</p>
      )}
    </article>
  )
}

// The small system lines: video call, reminder, nudge, status changes, closing
const NOTICE_ICONS = { call: 'video', reminder: 'bell-small', nudge: 'clock-amber' }

export function NoticeLine({ message, callLink }) {
  const tone = { reminder: 'info', nudge: 'pending', closed: 'muted' }[message.kind] || 'plain'
  return (
    <p className={`chat-notice chat-notice--${tone}`}>
      {NOTICE_ICONS[message.kind] && <Icon name={NOTICE_ICONS[message.kind]} />}
      <span>{message.text}</span>
      {message.kind === 'call' && callLink && (
        <a className="chat-notice__link" href={callLink} target="_blank" rel="noreferrer">
          Join call
        </a>
      )}
    </p>
  )
}
