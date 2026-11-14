import radioOn from '../assets/icons/radio-on.svg'
import radioOff from '../assets/icons/radio-off.svg'
import './RoleOption.css'

// One of the two big choice cards on H1. A real radio input underneath, so keyboard and screen readers work.
export function RoleOption({ value, title, description, icon, checked, onChange }) {
  return (
    <label className={checked ? 'role-option role-option--checked' : 'role-option'}>
      <input
        className="visually-hidden"
        type="radio"
        name="role"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
      <span className="role-option__icon">
        <img src={icon} alt="" />
      </span>
      <span className="role-option__text">
        <span className="role-option__title">{title}</span>
        <span className="role-option__description">{description}</span>
      </span>
      <img className="role-option__radio" src={checked ? radioOn : radioOff} alt="" />
    </label>
  )
}
