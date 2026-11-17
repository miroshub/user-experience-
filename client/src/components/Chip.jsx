import './Chip.css'

// Figma "Chip": filters, skills and "why it fits you" reasons.
// state: "default", "selected" (an active filter) or "missing" (a skill the person lacks: dashed, never colour alone)
export function Chip({ state = 'default', onClick, children, ...rest }) {
  const className = `chip chip--${state}`
  if (onClick) {
    return (
      <button type="button" className={`${className} chip--button`} onClick={onClick} {...rest}>
        {children}
      </button>
    )
  }
  return (
    <span className={className} {...rest}>
      {children}
    </span>
  )
}
