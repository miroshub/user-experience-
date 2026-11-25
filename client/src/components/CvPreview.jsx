import { dateRange } from '../services/cvText'
import { Chip } from './Chip'

// H6 right side, "what recruiters see": the same layout as the exported PDF.
// Problems are tinted amber and named in words ("Dates missing"), so colour is never the only sign.
export function CvPreview({ cv, missingSkill, onAddSkill }) {
  const contact = [cv.headline, cv.city, cv.email, cv.phone].filter(Boolean).join(' · ')
  const datesMissing = new Set(cv.rolesMissingDates)

  return (
    <section className="cv-preview-wrap" aria-labelledby="preview-title">
      <p className="overline" id="preview-title">
        Preview · what recruiters see
      </p>
      <article className="cv-preview">
        <h2 className="cv-preview__name">{cv.fullName}</h2>
        {contact && <p className="cv-preview__contact">{contact}</p>}

        <div className="cv-preview__section">
          <h3 className="cv-preview__heading">About me</h3>
          {cv.summary ? (
            <p className={`cv-preview__text${cv.summaryTooLong ? ' cv-preview__flag' : ''}`}>
              {cv.summary}
              {cv.summaryTooLong && <span className="visually-hidden"> (too long)</span>}
            </p>
          ) : (
            <p className="cv-preview__empty">Nothing here yet.</p>
          )}
        </div>

        <div className="cv-preview__section">
          <h3 className="cv-preview__heading">Experience</h3>
          {cv.experience.length === 0 && <p className="cv-preview__empty">Nothing here yet.</p>}
          {cv.experience.map((role, index) => (
            <div className="cv-preview__entry" key={`${role.title}-${index}`}>
              <div className={`cv-preview__row${datesMissing.has(index) ? ' cv-preview__flag cv-preview__flag--row' : ''}`}>
                <span className="cv-preview__title">{role.company ? `${role.title} · ${role.company}` : role.title}</span>
                {datesMissing.has(index) ? (
                  <span className="cv-preview__warn">Dates missing</span>
                ) : (
                  <span className="cv-preview__dates">{dateRange(role.startDate, role.endDate)}</span>
                )}
              </div>
              {role.bullets.map((bullet) => (
                <p className="cv-preview__text" key={bullet}>
                  • {bullet}
                </p>
              ))}
            </div>
          ))}
        </div>

        <div className="cv-preview__section">
          <h3 className="cv-preview__heading">Education</h3>
          {cv.education.length === 0 && <p className="cv-preview__empty">Nothing here yet.</p>}
          {cv.education.map((school, index) => (
            <div className="cv-preview__row" key={`${school.school}-${index}`}>
              <span className="cv-preview__title">{[school.degree, school.school].filter(Boolean).join(' · ')}</span>
              <span className="cv-preview__dates">{dateRange(school.startYear, school.endYear)}</span>
            </div>
          ))}
        </div>

        <div className="cv-preview__section">
          <h3 className="cv-preview__heading">Skills</h3>
          <div className="chip-row">
            {cv.skills.map((skill) => (
              <Chip key={skill}>{skill}</Chip>
            ))}
            {missingSkill && (
              <Chip state="missing" onClick={onAddSkill} aria-label={`Add ${missingSkill} to your skills`}>
                + {missingSkill}
              </Chip>
            )}
          </div>
        </div>
      </article>
    </section>
  )
}
