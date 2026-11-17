import { useEffect, useRef } from 'react'

const TYPING = ['INPUT', 'TEXTAREA', 'SELECT']

// FR-13 arrow keys: ← for no, → for yes, Z for undo.
// Keys are ignored while the user types in a box or holds Ctrl/Alt/Cmd.
export function useSwipeKeys({ onLeft, onRight, onUndo, enabled = true }) {
  // The latest handlers live in a ref, so the listener is added once and never goes stale
  const handlers = useRef({ onLeft, onRight, onUndo })
  useEffect(() => {
    handlers.current = { onLeft, onRight, onUndo }
  })

  useEffect(() => {
    if (!enabled) return undefined

    function handleKey(event) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target
      if (TYPING.includes(target.tagName) || target.isContentEditable) return

      const { onLeft: left, onRight: right, onUndo: undo } = handlers.current
      if (event.key === 'ArrowLeft' && left) {
        event.preventDefault()
        left()
      } else if (event.key === 'ArrowRight' && right) {
        event.preventDefault()
        right()
      } else if ((event.key === 'z' || event.key === 'Z') && undo) {
        undo()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [enabled])
}
