import './Stars.css'

// Five stars, filled up to the value. The number is always said in words too (never colour alone).
export function Stars({ value, size = 'md' }) {
  return (
    <span className={`stars stars--${size}`} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(value) ? 'stars__on' : 'stars__off'} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  )
}

// FR-39 on cards: "★ 4.5 · 3 reviews", or nothing until someone has a visible review
export function RatingTag({ rating }) {
  if (!rating) return null
  return (
    <span className="rating-tag">
      <span className="stars__on" aria-hidden="true">
        ★
      </span>
      {rating.average.toFixed(1)}
      <span className="rating-tag__count">
        · {rating.count} review{rating.count === 1 ? '' : 's'}
      </span>
      <span className="visually-hidden"> (average out of 5)</span>
    </span>
  )
}

// The star picker in the review form: a radio group, so arrow keys and screen readers work
export function StarPicker({ value, onChange }) {
  return (
    <div className="star-picker" role="radiogroup" aria-labelledby="stars-label">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          className={`star-picker__star${n <= value ? ' star-picker__star--on' : ''}`}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}
