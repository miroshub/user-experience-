import { initials } from '../services/format'
import './Avatar.css'

// H4 and H5: companies are square tiles, people are round. The colour is picked from the id,
// so the same person always gets the same colour. It is decoration only, the name is always next to it.
const TONES = ['ink', 'info', 'pending', 'brand']

function toneFor(id = '') {
  let sum = 0
  for (const char of String(id)) sum += char.charCodeAt(0)
  return TONES[sum % TONES.length]
}

export function Avatar({ name, id, role, size = 40 }) {
  const shape = role === 'company' ? 'square' : 'round'
  return (
    <span
      className={`avatar avatar--${shape} avatar--${toneFor(id || name)}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
