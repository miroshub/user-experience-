import { useEffect, useState } from 'react'
import { matchApi } from '../services/MatchApi'
import { dayText, timeText } from '../services/format'
import { Button } from './Button'
import { Chip } from './Chip'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { SegmentedControl } from './SegmentedControl'

// H5 "Book an interview". The same dialog also picks a new time (FR-24):
// mode "book" (company), "ask" (seeker asks for another time), "suggest" (company offers another time).
const TEXT = {
  book: { title: 'Book an interview', submit: 'Send invite' },
  ask: { title: 'Ask for another time', submit: 'Send request' },
  suggest: { title: 'Suggest another time', submit: 'Send new time' },
}

// Free slots arrive as ISO strings; the chips group them by day
function groupByDay(slots) {
  const days = []
  for (const slot of slots) {
    const label = dayText(slot)
    let day = days.find((d) => d.label === label)
    if (!day) {
      day = { label, times: [] }
      days.push(day)
    }
    day.times.push(slot)
  }
  return days
}

export function BookInterviewDialog({ mode = 'book', matchId, withText, otherFirstName, onCancel, onSubmit }) {
  const [slots, setSlots] = useState(null)
  const [type, setType] = useState('video')
  const [day, setDay] = useState('')
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const text = TEXT[mode]

  useEffect(() => {
    let current = true
    matchApi
      .slots(matchId)
      .then((found) => {
        if (!current) return
        setSlots(found)
        if (found.length > 0) setDay(dayText(found[0]))
      })
      .catch((loadError) => current && setError(loadError.message))
    return () => {
      current = false
    }
  }, [matchId])

  const days = groupByDay(slots || [])
  const times = days.find((d) => d.label === day)?.times || []

  async function handleSubmit() {
    if (!time) {
      setError('Pick a day and a time')
      return
    }
    setSending(true)
    setError('')
    try {
      await onSubmit(mode === 'book' ? { type, dateTime: time, note } : time)
    } catch (submitError) {
      setError(submitError.message)
      setSending(false)
    }
  }

  const reminderNote = {
    book: `${otherFirstName} gets the invite now and a reminder 1 hour before.`,
    ask: `${otherFirstName} sees the time you asked for and can take it or suggest another.`,
    suggest: `${otherFirstName} gets the new time now and accepts it in the chat.`,
  }[mode]

  return (
    <Dialog
      title={text.title}
      subtitle={withText}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" className="dialog__cancel" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="dialog__submit" onClick={handleSubmit} disabled={sending || !slots}>
            {text.submit}
          </Button>
        </>
      }
    >
      {mode === 'book' && (
        <div className="dialog__group">
          <p className="overline" id="how-label">
            How
          </p>
          <SegmentedControl
            label="How"
            value={type}
            onChange={setType}
            options={[
              { value: 'video', label: <><Icon name="video" />Video call</> },
              { value: 'in person', label: <><Icon name="person-small" />In person</> },
            ]}
          />
        </div>
      )}

      {slots === null && !error && <p className="dialog__label">Finding free times…</p>}
      {slots && slots.length === 0 && <p className="dialog__label">No free times in the next few days.</p>}

      {days.length > 0 && (
        <>
          <div className="dialog__group" role="radiogroup" aria-labelledby="day-label">
            <p className="overline" id="day-label">
              Day
            </p>
            <div className="chip-row">
              {days.map((d) => (
                <Chip
                  key={d.label}
                  role="radio"
                  aria-checked={d.label === day}
                  state={d.label === day ? 'selected' : 'default'}
                  onClick={() => {
                    setDay(d.label)
                    setTime('')
                  }}
                >
                  {d.label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="dialog__group" role="radiogroup" aria-labelledby="time-label">
            <p className="overline" id="time-label">
              Time (Cairo)
            </p>
            <div className="chip-row">
              {times.map((slot) => (
                <Chip
                  key={slot}
                  role="radio"
                  aria-checked={slot === time}
                  state={slot === time ? 'selected' : 'default'}
                  onClick={() => setTime(slot)}
                >
                  {timeText(slot)}
                </Chip>
              ))}
              <Chip aria-label="Length: 30 minutes">30 min</Chip>
            </div>
          </div>
        </>
      )}

      {mode === 'book' && (
        <div className="dialog__field">
          <label className="dialog__label" htmlFor="invite-note">
            Message (optional)
          </label>
          <textarea
            id="invite-note"
            className="dialog__textarea"
            maxLength={300}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      )}

      <p className="dialog__note">
        <Icon name="bell-small" />
        {reminderNote}
      </p>
      {error && (
        <p className="dialog__error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  )
}
