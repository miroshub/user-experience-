import { useState } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { TextField } from './TextField'

// H8 "Edit profile". The fields are the ones the server lets each role change.
// Skills are edited on My CV, so they are not repeated here.
const FIELDS = {
  seeker: [
    { key: 'fullName', label: 'Full name' },
    { key: 'headline', label: 'Headline', hint: 'For example: Frontend developer' },
    { key: 'city', label: 'City' },
  ],
  company: [
    { key: 'fullName', label: 'Your name' },
    { key: 'companyName', label: 'Company name' },
    { key: 'industry', label: 'Industry' },
    { key: 'location', label: 'Location' },
  ],
}

export function EditProfileDialog({ user, onCancel, onSubmit }) {
  const fields = FIELDS[user.role] || []
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, user[f.key] || ''])))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event?.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit(values)
    } catch (submitError) {
      setError(submitError.message)
      setSaving(false)
    }
  }

  return (
    <Dialog
      title="Edit profile"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" className="dialog__cancel" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="dialog__submit" onClick={handleSubmit} disabled={saving}>
            Save
          </Button>
        </>
      }
    >
      <form className="dialog__group" onSubmit={handleSubmit}>
        {fields.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            hint={field.hint}
            value={values[field.key]}
            maxLength={80}
            onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
          />
        ))}
      </form>
      {error && (
        <p className="dialog__error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  )
}
