import './KeyHints.css'

// "Keys: ← Skip  → Interested  Z Undo" in the top right of the swipe screens
export function KeyHints({ keys }) {
  return (
    <div className="key-hints">
      <span className="key-hints__label">Keys:</span>
      {keys.map((text) => (
        <kbd key={text} className="key-hints__key">
          {text}
        </kbd>
      ))}
    </div>
  )
}
