import './SegmentedControl.css'

// The grey pill with one white option: H9 "To review / Check later" and H10 "Where"
export function SegmentedControl({ label, options, value, onChange, size = 'md' }) {
  return (
    <div className={`segmented segmented--${size}`} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={`segmented__option${option.value === value ? ' segmented__option--on' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
