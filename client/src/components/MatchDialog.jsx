import { useEffect, useRef } from 'react'
import { initials } from '../services/format'
import { Icon } from './Icon'
import './MatchDialog.css'

// H3 "It's a match". you / them: { name, shape: 'round' | 'square' }
export function MatchDialog({ you, them, jobTitle, onKeepSwiping, onSayHi }) {
  const sayHiRef = useRef(null)
  const keepRef = useRef(null)
  const closeRef = useRef(onKeepSwiping)
  useEffect(() => {
    closeRef.current = onKeepSwiping
  })

  // Focus goes into the dialog, Escape closes it, Tab stays inside it (NFR-07)
  useEffect(() => {
    const before = document.activeElement
    sayHiRef.current?.focus()

    function handleKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
      } else if (event.key === 'Tab') {
        event.preventDefault()
        const next = document.activeElement === sayHiRef.current ? keepRef.current : sayHiRef.current
        next?.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      before?.focus?.()
    }
  }, [])

  return (
    <div className="match-overlay" onClick={onKeepSwiping}>
      <div
        className="match-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-title"
        aria-describedby="match-text"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="match-dialog__overline">YOU BOTH SAID YES</p>
        <h2 className="match-dialog__title" id="match-title">
          It’s a match
        </h2>
        <div className="match-dialog__faces" aria-hidden="true">
          <span className={`match-dialog__face match-dialog__face--${you.shape}`}>{initials(you.name)}</span>
          <span className={`match-dialog__face match-dialog__face--${them.shape}`}>{initials(them.name)}</span>
        </div>
        <p className="match-dialog__text" id="match-text">
          You and {them.name} both want to talk about {jobTitle}.
        </p>
        <p className="match-dialog__note">
          <Icon name="clock" />
          If nobody writes for 5 days, we’ll send a reminder.
        </p>
        <div className="match-dialog__actions">
          <button ref={keepRef} type="button" className="match-dialog__button match-dialog__button--outline" onClick={onKeepSwiping}>
            Keep swiping
          </button>
          <button ref={sayHiRef} type="button" className="match-dialog__button match-dialog__button--white" onClick={onSayHi}>
            Say hi
          </button>
        </div>
      </div>
    </div>
  )
}
