import { barStatus, dayText, dayTimeText, nextMeeting, placeText, salaryText } from '../services/format'
import { Button } from './Button'
import { Icon } from './Icon'
import { StatusBar } from './StatusBar'

const STEPS = [
  { key: 'matched', label: 'Matched' },
  { key: 'chatting', label: 'Chatting' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
]

// H4 right column: the job, the 5 progress steps with dates (FR-27), and closing with a reason (FR-29)
export function MatchDetails({ match, names, onClose, onMoveStatus, busy, open }) {
  const side = match.mySide
  const job = match.job
  const reached = STEPS.findIndex((s) => s.key === barStatus(match))
  const meeting = nextMeeting(match)
  const closed = match.status === 'closed'
  // FR-27: the company moves the bar to Offer, then Hired. The earlier steps move by themselves.
  const nextStep = { interview: 'offer', chatting: 'offer', offer: 'hired' }[match.status]

  return (
    <aside className={`match-details${open ? ' match-details--open' : ''}`} aria-label="About this match">
      <p className="overline">About this match</p>
      <h2 className="match-details__job">{job?.title || 'Job removed'}</h2>
      {job && (
        <>
          <p className="match-details__place">{[names.company, placeText(job)].join(' · ')}</p>
          <p className="match-details__salary">{salaryText(job.salaryMin, job.salaryMax)}</p>
        </>
      )}
      <hr className="match-details__line" />

      <p className="overline">Progress</p>
      <StatusBar status={barStatus(match)} waiting={match.isWaiting} />
      <ol className="steps">
        {STEPS.map((step, i) => {
          const isFinal = step.key === 'hired' && match.status === 'hired'
          const state = i < reached || isFinal ? 'done' : i === reached && !closed ? 'current' : 'todo'
          let when = match.stepDates?.[step.key] ? dayText(match.stepDates[step.key]) : ''
          if (step.key === 'interview' && meeting) when = dayTimeText(meeting.dateTime)
          return (
            <li key={step.key} className={`step step--${state}`}>
              <span className="step__dot" aria-hidden="true">
                {state === 'done' && <Icon name="check" />}
              </span>
              <span className="step__words">
                <span className="step__label">
                  {step.label}
                  <span className="visually-hidden">{state === 'done' ? ' (done)' : state === 'current' ? ' (now)' : ''}</span>
                </span>
                {when && state !== 'todo' && <span className="step__when">{when}</span>}
              </span>
            </li>
          )
        })}
      </ol>
      {side === 'company' && nextStep && !closed && (
        <Button variant="ghost" className="match-details__move" onClick={() => onMoveStatus(nextStep)} disabled={busy}>
          {nextStep === 'offer' ? 'Move to Offer →' : 'Mark as Hired →'}
        </Button>
      )}

      <div className="match-details__grow" />
      {closed ? (
        <p className="match-details__text">
          Closed by {match.closedBy === side ? 'you' : match.closedBy === 'company' ? names.company : names.seeker}. Reason: {match.closeReason}
        </p>
      ) : (
        <>
          <p className="match-details__text">
            {side === 'seeker'
              ? `If this doesn’t work out, ${names.company} has to tell you why. No ghosting.`
              : `To close this match you’ll need to pick a reason. ${names.seeker} will see it.`}
          </p>
          <Button variant="secondary" fullWidth onClick={onClose} disabled={busy || match.status === 'hired'}>
            {side === 'seeker' ? 'Not interested anymore' : 'Close match'}
          </Button>
        </>
      )}
    </aside>
  )
}
