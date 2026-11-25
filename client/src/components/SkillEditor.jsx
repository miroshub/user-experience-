import { useState } from 'react'
import './SkillEditor.css'

// H10 "Skills you want": chips with ×, and "+ Add skill" that turns into a small box
export function SkillEditor({ skills, onChange }) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')

  function add() {
    const skill = text.trim()
    if (skill && !skills.some((s) => s.toLowerCase() === skill.toLowerCase())) onChange([...skills, skill])
    setText('')
    setAdding(false)
  }

  function handleKey(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      add()
    } else if (event.key === 'Escape') {
      setText('')
      setAdding(false)
    }
  }

  return (
    <div className="chip-row">
      {skills.map((skill) => (
        <span key={skill} className="chip">
          {skill}
          <button
            type="button"
            className="skill-remove"
            aria-label={`Remove ${skill}`}
            onClick={() => onChange(skills.filter((s) => s !== skill))}
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <input
          className="skill-input"
          aria-label="New skill"
          value={text}
          maxLength={30}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKey}
          onBlur={add}
          autoFocus
        />
      ) : (
        <button type="button" className="skill-add" onClick={() => setAdding(true)}>
          + Add skill
        </button>
      )}
    </div>
  )
}
