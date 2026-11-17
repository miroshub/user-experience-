import { useState } from 'react'
import { Button } from './Button'
import { TextField } from './TextField'

// FR-15 filters. The parent gets { role, city, workMode, minSalary } with empty ones left out.
export function FilterPanel({ filters, onApply, onClose }) {
  const [draft, setDraft] = useState({
    role: filters.role || '',
    city: filters.city || '',
    workMode: filters.workMode || '',
    minSalary: filters.minSalary ?? '',
  })

  function change(name) {
    return (event) => setDraft({ ...draft, [name]: event.target.value })
  }

  function handleSubmit(event) {
    event.preventDefault()
    const clean = {}
    if (draft.role.trim()) clean.role = draft.role.trim()
    if (draft.city.trim()) clean.city = draft.city.trim()
    if (draft.workMode) clean.workMode = draft.workMode
    if (String(draft.minSalary).trim() !== '') clean.minSalary = Number(draft.minSalary)
    onApply(clean)
  }

  return (
    <form className="filter-panel" onSubmit={handleSubmit} aria-label="Filters">
      <TextField label="Job title has" value={draft.role} onChange={change('role')} placeholder="Frontend" />
      <TextField label="City" value={draft.city} onChange={change('city')} placeholder="Cairo" />
      <div className="text-field">
        <label className="text-field__label" htmlFor="filter-mode">
          Where
        </label>
        <select id="filter-mode" className="text-field__input" value={draft.workMode} onChange={change('workMode')}>
          <option value="">Anywhere</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>
      </div>
      <TextField
        label="Pay at least (EGP / month)"
        type="number"
        min="0"
        step="1000"
        inputMode="numeric"
        value={draft.minSalary}
        onChange={change('minSalary')}
        placeholder="12000"
      />
      <div className="filter-panel__actions">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Show jobs</Button>
      </div>
    </form>
  )
}
