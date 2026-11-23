import { useEffect, useRef } from 'react'
import { Icon } from './Icon'
import './Dialog.css'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])'

// Figma H5 "Book interview dialog": white, 560 wide, title + subtitle, a close button top right.
// Focus goes inside, Tab stays inside, Escape closes, and focus goes back afterwards (NFR-07).
export function Dialog({ title, subtitle, onClose, children, footer }) {
  const boxRef = useRef(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const before = document.activeElement
    const box = boxRef.current
    const first = box.querySelector('[data-autofocus]') || box.querySelector(FOCUSABLE)
    first?.focus()

    function handleKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = [...box.querySelectorAll(FOCUSABLE)]
      if (items.length === 0) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      before?.focus?.()
    }
  }, [])

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        ref={boxRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog__head">
          <div className="dialog__titles">
            <h2 className="dialog__title" id="dialog-title">
              {title}
            </h2>
            {subtitle && <p className="dialog__subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="dialog__close" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        {children}
        {footer && <div className="dialog__footer">{footer}</div>}
      </div>
    </div>
  )
}
