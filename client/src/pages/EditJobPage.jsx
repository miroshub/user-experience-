import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import liveDot from '../assets/icons/dot-live.svg'
import amberDot from '../assets/icons/dot-amber.svg'
import { AppLayout } from '../components/AppLayout'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { JobCover } from '../components/JobCover'
import { SegmentedControl } from '../components/SegmentedControl'
import { SkillEditor } from '../components/SkillEditor'
import { TextField } from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { displayName, initials, placeText, salaryText } from '../services/format'
import { jobApi } from '../services/JobApi'
import './EditJobPage.css'

const EMPTY = { title: '', salaryMin: '', salaryMax: '', workMode: 'hybrid', city: '', skills: [], description: '' }

const WHERE = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

const STATUS = {
  live: { text: 'Live', dot: liveDot },
  paused: { text: 'Paused', dot: amberDot },
  closed: { text: 'Closed', dot: null },
}

// Keeps only digits, so "14,000" and "14000" are the same
function digits(value) {
  return String(value).replace(/\D/g, '')
}

function withCommas(value) {
  return value === '' ? '' : Number(value).toLocaleString('en-US')
}

function toForm(job) {
  return {
    title: job.title,
    salaryMin: String(job.salaryMin),
    salaryMax: String(job.salaryMax),
    workMode: job.workMode,
    city: job.city || '',
    skills: job.skills,
    description: job.description || '',
  }
}

// H10 Edit a live job (FR-31, FR-32). With no id in the address it posts a new job instead (FR-30).
// The key gives each job its own fresh form, so going from one job to another never mixes their fields.
export function EditJobPage() {
  const { id } = useParams()
  return <JobForm key={id || 'new'} id={id} />
}

function JobForm({ id }) {
  const isNew = !id
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const fileInput = useRef(null)

  const [job, setJob] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(location.state?.notice || null)
  const [newImage, setNewImage] = useState(null) // { file, url } picked before a new job is saved

  useEffect(() => {
    if (isNew) return
    jobApi
      .get(id)
      .then((found) => {
        setJob(found)
        setForm(toForm(found))
      })
      .catch((error) => setNotice({ text: error.message, tone: 'error' }))
      .finally(() => setLoading(false))
  }, [id, isNew])

  // The temporary preview URL of a picked image is freed when it is replaced or the page closes
  useEffect(() => () => newImage && URL.revokeObjectURL(newImage.url), [newImage])

  function set(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function body() {
    return {
      title: form.title,
      salaryMin: Number(form.salaryMin),
      salaryMax: Number(form.salaryMax),
      workMode: form.workMode,
      city: form.workMode === 'remote' ? '' : form.city,
      skills: form.skills,
      description: form.description,
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (form.salaryMin === '' || form.salaryMax === '') {
      setNotice({ text: 'Please fill in both salary boxes', tone: 'error' })
      return
    }
    setSaving(true)
    setNotice(null)
    try {
      if (isNew) {
        const created = await jobApi.create(body())
        if (newImage) await jobApi.uploadImage(created.id, newImage.file)
        navigate(`/jobs/${created.id}/edit`, { replace: true, state: { notice: { text: 'Job posted. It is live now.' } } })
      } else {
        const saved = await jobApi.edit(id, body())
        setJob(saved)
        setForm(toForm(saved))
        setNotice({ text: 'Changes saved. They are live now.' })
      }
    } catch (error) {
      setNotice({ text: error.message, tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function togglePause() {
    setNotice(null)
    try {
      const saved = job.status === 'live' ? await jobApi.pause(id) : await jobApi.resume(id)
      setJob(saved)
      setNotice({ text: saved.status === 'live' ? 'The job is live again.' : 'Paused. Seekers will not see it until you resume.' })
    } catch (error) {
      setNotice({ text: error.message, tone: 'error' })
    }
  }

  // FR-32: closing cannot be undone, so it asks first. Existing matches stay.
  async function closeJob() {
    if (!window.confirm('Close this job for good? Seekers will stop seeing it. Your matches stay.')) return
    setNotice(null)
    try {
      setJob(await jobApi.close(id))
      setNotice({ text: 'Job closed. Your matches are still in Matches.' })
    } catch (error) {
      setNotice({ text: error.message, tone: 'error' })
    }
  }

  async function pickImage(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    if (isNew) {
      setNewImage({ file, url: URL.createObjectURL(file) })
      return
    }
    setNotice(null)
    try {
      setJob(await jobApi.uploadImage(id, file))
      setNotice({ text: 'New cover image saved.' })
    } catch (error) {
      setNotice({ text: error.message, tone: 'error' })
    }
  }

  const coverSrc = newImage?.url || job?.imageUrl
  const companyName = displayName(user)
  const status = job ? STATUS[job.status] : null
  const closed = job?.status === 'closed'
  const preview = { ...body(), salaryMin: Number(form.salaryMin) || 0, salaryMax: Number(form.salaryMax) || 0 }

  if (loading) {
    return (
      <AppLayout>
        <p className="panel__text">Loading the job…</p>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <form className="edit-job" onSubmit={handleSubmit}>
        <div className="edit-job__header">
          <Link className="edit-job__back" to={id ? `/swipe?job=${id}` : '/swipe'} aria-label="Back">
            <Icon name="back" />
          </Link>
          <h1 className="edit-job__title">{isNew ? 'Post a job' : 'Edit job'}</h1>
          {status && (
            <span className={`job-status job-status--${job.status}`}>
              {status.dot && <img src={status.dot} alt="" />}
              {status.text}
            </span>
          )}
          <span className="edit-job__spacer" />
          {job && !closed && (
            <>
              <Button variant="ghost" className="edit-job__close" onClick={closeJob}>
                Close job
              </Button>
              <Button variant="ghost" onClick={togglePause}>
                {job.status === 'live' ? 'Pause job' : 'Resume job'}
              </Button>
            </>
          )}
          <Button type="submit" disabled={saving || closed}>
            {isNew ? 'Post job' : 'Save changes'}
          </Button>
        </div>

        <div className="notice-area" role="status" aria-live="polite">
          {notice && <p className={`edit-job__notice edit-job__notice--${notice.tone || 'ok'}`}>{notice.text}</p>}
        </div>

        <div className="edit-job__columns">
          <fieldset className="edit-job__fields" disabled={closed}>
            <div className="field">
              <span className="field__label">Cover image</span>
              <JobCover src={coverSrc} className="job-cover--edit">
                <button type="button" className="job-cover__change" onClick={() => fileInput.current.click()}>
                  <Icon name="image" />
                  Change image
                </button>
              </JobCover>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="visually-hidden"
                tabIndex={-1}
                aria-hidden="true"
                onChange={pickImage}
              />
            </div>

            <TextField label="Job title" value={form.title} maxLength={80} required onChange={(e) => set('title', e.target.value)} />

            <div className="field">
              <span className="field__label" id="salary-label">
                Salary range (EGP / month)
              </span>
              <div className="salary-row">
                <input
                  className="text-field__input salary-input"
                  aria-label="Lowest salary"
                  aria-describedby="salary-label"
                  inputMode="numeric"
                  value={withCommas(form.salaryMin)}
                  onChange={(e) => set('salaryMin', digits(e.target.value))}
                />
                <span className="salary-row__to">to</span>
                <input
                  className="text-field__input salary-input"
                  aria-label="Highest salary"
                  aria-describedby="salary-label"
                  inputMode="numeric"
                  value={withCommas(form.salaryMax)}
                  onChange={(e) => set('salaryMax', digits(e.target.value))}
                />
              </div>
            </div>

            <div className="field">
              <span className="field__label">Where</span>
              <SegmentedControl label="Where" size="wide" options={WHERE} value={form.workMode} onChange={(v) => set('workMode', v)} />
            </div>

            {form.workMode !== 'remote' && (
              <TextField label="City or area" value={form.city} maxLength={50} onChange={(e) => set('city', e.target.value)} />
            )}

            <div className="field">
              <span className="field__label">Skills you want</span>
              <SkillEditor skills={form.skills} onChange={(skills) => set('skills', skills)} />
            </div>

            <div className="text-field">
              <label className="text-field__label" htmlFor="job-description">
                About the job
              </label>
              <textarea
                id="job-description"
                className="text-field__input edit-job__textarea"
                rows={4}
                maxLength={1000}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>

            {!isNew && (
              <p className="info-note">
                <Icon name="bell" />
                Changes go live straight away. People you’ve already matched with get a short “Job updated” note.
              </p>
            )}
          </fieldset>

          <section className="edit-job__preview" aria-labelledby="preview-title">
            <p className="overline" id="preview-title">
              How candidates see it
            </p>
            <div className="job-preview">
              <JobCover src={coverSrc} className="job-cover--preview" />
              <div className="job-preview__body">
                <div className="job-preview__company">
                  <span className="job-preview__logo" aria-hidden="true">
                    {initials(companyName)}
                  </span>
                  <span className="job-preview__who">
                    <span className="job-preview__name">{companyName}</span>
                    {user.location && <span className="panel__text">{user.location}</span>}
                  </span>
                </div>
                <p className="job-preview__title">{form.title || 'Job title'}</p>
                <p className="job-preview__meta">
                  <span className="job-card__salary">{salaryText(preview.salaryMin, preview.salaryMax)}</span>
                  <span className="panel__text">{placeText(preview)}</span>
                </p>
                {form.skills.length > 0 && (
                  <div className="chip-row">
                    {form.skills.map((skill) => (
                      <Chip key={skill}>{skill}</Chip>
                    ))}
                  </div>
                )}
                <div className="job-preview__buttons" aria-hidden="true">
                  <span className="button button--secondary button--md job-preview__no">Skip</span>
                  <span className="button button--primary button--md job-preview__yes">Interested</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </form>
    </AppLayout>
  )
}
