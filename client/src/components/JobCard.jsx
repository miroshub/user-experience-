import { initials, placeText, salaryText } from '../services/format'
import { Chip } from './Chip'
import { Icon } from './Icon'
import { RatingTag } from './Stars'

// H2 top card (FR-12): company, "% fit", title, pay, place, "why it fits you" chips, description
export function JobCard({ card }) {
  const company = card.company
  const companyName = company?.name || 'Company'
  const hasReasons = card.whyItFits?.length > 0 || card.missingSkills?.length > 0

  return (
    <article className="swipe-card job-card" aria-label={`${card.title} at ${companyName}`}>
      <div className="job-card__head">
        {company?.logoUrl ? (
          <img className="job-card__logo" src={company.logoUrl} alt="" />
        ) : (
          <span className="job-card__logo" aria-hidden="true">
            {initials(companyName)}
          </span>
        )}
        <div className="job-card__company">
          <p className="job-card__company-line">
            <span className="job-card__company-name">{companyName}</span>
            {company?.isVerified && (
              <span className="job-card__verified">
                <Icon name="shield-small" />
                Verified
              </span>
            )}
          </p>
          {company?.location && <p className="job-card__sub">{company.location}</p>}
          <RatingTag rating={company?.rating} />
        </div>
        {typeof card.fit === 'number' && <p className="job-card__fit">{card.fit}% fit</p>}
      </div>

      <h2 className="job-card__title">{card.title}</h2>
      <p className="job-card__meta">
        <span className="job-card__salary">{salaryText(card.salaryMin, card.salaryMax)}</span>
        <span className="job-card__place">{placeText(card)}</span>
      </p>

      <hr className="job-card__rule" />

      {hasReasons && (
        <>
          <p className="overline">Why it fits you</p>
          <div className="chip-row">
            {card.whyItFits.map((skill) => (
              <Chip key={skill}>{skill} ✓</Chip>
            ))}
            {card.missingSkills.map((skill) => (
              <Chip key={skill} state="missing">
                <span className="visually-hidden">Missing: </span>
                {skill}
              </Chip>
            ))}
          </div>
        </>
      )}

      {card.description && <p className="job-card__description">{card.description}</p>}
    </article>
  )
}
