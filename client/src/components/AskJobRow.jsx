import { useState } from 'react'
import { placeText, shortMoney } from '../services/format'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { Chip } from './Chip'
import { Icon } from './Icon'

// "EGP 14k–18k", or "EGP 12k" when both ends are the same (H7 rows)
function payText(job) {
  if (job.salaryMin === job.salaryMax) return `EGP ${shortMoney(job.salaryMin)}`
  return `EGP ${shortMoney(job.salaryMin)}–${shortMoney(job.salaryMax)}`
}

// H7 job row: logo, title, company and place, pay, "% fit" and a chevron.
// The chevron opens the details with Skip and Interested (not in the frame: the same actions as H2).
export function AskJobRow({ job, onSwipe }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const company = job.company?.name || 'Company'

  async function choose(interested) {
    setBusy(true)
    await onSwipe(job, interested)
    setBusy(false)
  }

  return (
    <article className={`ask-job${open ? ' ask-job--open' : ''}`}>
      <button type="button" className="ask-job__summary" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Avatar name={company} id={job.companyId} role="company" size={44} />
        <span className="ask-job__words">
          <span className="ask-job__title">{job.title}</span>
          <span className="ask-job__where">
            {company} · {placeText(job)}
          </span>
          <span className="ask-job__pay">{payText(job)}</span>
        </span>
        <span className="ask-job__fit">{job.fit}% fit</span>
        <Icon name="chevron" className="ask-job__chevron" />
      </button>
      {open && (
        <div className="ask-job__details">
          {job.description && <p className="ask-job__description">{job.description}</p>}
          <div className="chip-row" aria-label="Skills this job asks for">
            {job.whyItFits.map((skill) => (
              <Chip key={skill}>{skill}</Chip>
            ))}
            {job.missingSkills.map((skill) => (
              <Chip key={skill} state="missing" aria-label={`${skill}, not on your CV`}>
                {skill}
              </Chip>
            ))}
          </div>
          <div className="ask-job__actions">
            <Button variant="secondary" onClick={() => choose(false)} disabled={busy}>
              Skip
            </Button>
            <Button onClick={() => choose(true)} disabled={busy}>
              Interested
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}
