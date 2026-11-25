import { useState } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { SkillEditor } from './SkillEditor'
import { TextField } from './TextField'

// No Figma frame for the section forms: they reuse the H5 dialog and the H10 fields and skill chips.
const TITLES = {
  summary: { title: 'About me', subtitle: 'Two or three sentences. An ATS likes it under 60 words.' },
  experience: { title: 'Experience', subtitle: 'Jobs, internships, freelance work or big projects.' },
  education: { title: 'Education', subtitle: 'Your degree and where you studied.' },
  skills: { title: 'Skills', subtitle: 'The words recruiters search for. Your swipe cards use them too.' },
}

const NEW_ROLE = { title: '', company: '', startDate: '', endDate: '', bullets: [] }
const NEW_SCHOOL = { degree: '', school: '', startYear: '', endYear: '' }

function wordCount(text) {
  const words = text.trim().split(/\s+/)
  return words[0] === '' ? 0 : words.length
}

// Bullet points are typed one per line
function toLines(bullets) {
  return bullets.join('\n')
}

function fromLines(text) {
  return text.split('\n').map((line) => line.trim()).filter(Boolean)
}

// FR-08: one part of the CV form. focusIndex: the role to jump to from "Add dates".
export function CvSectionDialog({ section, cv, focusIndex, onSave, onClose }) {
  const [summary, setSummary] = useState(cv.summary)
  const [roles, setRoles] = useState(() => cv.experience.map((r) => ({ ...r, bulletText: toLines(r.bullets) })))
  const [schools, setSchools] = useState(() => cv.education.map((s) => ({ ...s })))
  const [skills, setSkills] = useState(cv.skills)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function changeRole(index, key, value) {
    setRoles(roles.map((role, i) => (i === index ? { ...role, [key]: value } : role)))
  }

  function changeSchool(index, key, value) {
    setSchools(schools.map((school, i) => (i === index ? { ...school, [key]: value } : school)))
  }

  function valueToSave() {
    if (section === 'summary') return summary
    if (section === 'experience') {
      return roles.map(({ bulletText, ...role }) => ({ ...role, bullets: fromLines(bulletText) }))
    }
    if (section === 'education') return schools
    return skills
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({ [section]: valueToSave() })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const words = wordCount(summary)

  return (
    <Dialog
      title={TITLES[section].title}
      subtitle={TITLES[section].subtitle}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" className="dialog__cancel" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="cv-section-form" className="dialog__submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="cv-section-form" className="cv-form" onSubmit={save}>
        {section === 'summary' && (
          <div className="dialog__field">
            <label className="dialog__label" htmlFor="cv-summary">
              About me
            </label>
            <textarea
              id="cv-summary"
              className="dialog__textarea cv-form__summary"
              value={summary}
              maxLength={2000}
              onChange={(event) => setSummary(event.target.value)}
              aria-describedby="cv-summary-count"
              data-autofocus
            />
            <p id="cv-summary-count" className={`cv-form__count${words > 60 ? ' cv-form__count--warn' : ''}`}>
              {words} / 60 words
            </p>
          </div>
        )}

        {section === 'experience' && (
          <>
            {roles.map((role, index) => (
              <fieldset className="cv-form__group" key={index}>
                <legend className="overline">Role {index + 1}</legend>
                <TextField label="Title" value={role.title} maxLength={80} required onChange={(e) => changeRole(index, 'title', e.target.value)} />
                <TextField label="Company" value={role.company} maxLength={80} onChange={(e) => changeRole(index, 'company', e.target.value)} />
                <div className="cv-form__pair">
                  <TextField
                    label="Start"
                    placeholder="Jul 2026"
                    value={role.startDate}
                    maxLength={20}
                    onChange={(e) => changeRole(index, 'startDate', e.target.value)}
                    data-autofocus={index === focusIndex ? true : undefined}
                  />
                  <TextField label="End" placeholder="Sep 2026 or Now" value={role.endDate} maxLength={20} onChange={(e) => changeRole(index, 'endDate', e.target.value)} />
                </div>
                <div className="dialog__field">
                  <label className="dialog__label" htmlFor={`cv-bullets-${index}`}>
                    What you did (one point per line)
                  </label>
                  <textarea
                    id={`cv-bullets-${index}`}
                    className="dialog__textarea"
                    value={role.bulletText}
                    onChange={(e) => changeRole(index, 'bulletText', e.target.value)}
                  />
                </div>
                <button type="button" className="cv-form__remove" onClick={() => setRoles(roles.filter((_, i) => i !== index))}>
                  Remove this role
                </button>
              </fieldset>
            ))}
            <button type="button" className="skill-add cv-form__add" onClick={() => setRoles([...roles, { ...NEW_ROLE, bulletText: '' }])}>
              + Add role
            </button>
          </>
        )}

        {section === 'education' && (
          <>
            {schools.map((school, index) => (
              <fieldset className="cv-form__group" key={index}>
                <legend className="overline">School {index + 1}</legend>
                <TextField label="Degree" placeholder="BSc Computer Science" value={school.degree} maxLength={80} onChange={(e) => changeSchool(index, 'degree', e.target.value)} />
                <TextField label="School" placeholder="Cairo University" value={school.school} maxLength={80} onChange={(e) => changeSchool(index, 'school', e.target.value)} />
                <div className="cv-form__pair">
                  <TextField label="From" placeholder="2022" value={school.startYear} maxLength={10} onChange={(e) => changeSchool(index, 'startYear', e.target.value)} />
                  <TextField label="To" placeholder="2026" value={school.endYear} maxLength={10} onChange={(e) => changeSchool(index, 'endYear', e.target.value)} />
                </div>
                <button type="button" className="cv-form__remove" onClick={() => setSchools(schools.filter((_, i) => i !== index))}>
                  Remove this school
                </button>
              </fieldset>
            ))}
            <button type="button" className="skill-add cv-form__add" onClick={() => setSchools([...schools, { ...NEW_SCHOOL }])}>
              + Add school
            </button>
          </>
        )}

        {section === 'skills' && <SkillEditor skills={skills} onChange={setSkills} />}

        {error && (
          <p className="dialog__error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  )
}
