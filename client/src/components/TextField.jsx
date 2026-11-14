import { useId } from 'react'
import './TextField.css'

// Not in the Figma design system yet: sized and coloured to match the Button (option b, agreed with the student)
export function TextField({ label, hint, ...inputProps }) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className="text-field">
      <label className="text-field__label" htmlFor={id}>
        {label}
      </label>
      <input className="text-field__input" id={id} aria-describedby={hintId} {...inputProps} />
      {hint && (
        <p className="text-field__hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  )
}
