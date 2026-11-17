import './StatusBar.css'

// FR-27, Figma "Status bar": Matched → Chatting → Interview → Offer → Hired.
// Always shown next to a text label. When the other side has not replied, the current step turns amber.
const STEPS =['matched', 'chatting', 'interview', 'offer', 'hired']

export function StatusBar({ status, waiting = false }) {
  const reached = STEPS.indexOf(status) + 1
  return (
    <div className="status-bar" aria-hidden="true">
      {STEPS.map((step, i) => {
        let state = 'todo'
        if (i < reached) state = waiting && i === reached - 1 ? 'waiting' : 'done'
        return <span key={step} className={`status-bar__step status-bar__step--${state}`} />
      })}
    </div>
  )
}
