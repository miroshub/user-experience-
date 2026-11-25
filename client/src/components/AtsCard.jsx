import { fixButtonText, potentialText, scoreHeadline } from '../services/cvText'
import { AtsRing } from './AtsRing'
import { Button } from './Button'

// H6 top-left card: the score, what it means, and up to 5 fixes with their points (FR-09).
// Each fix has one button: some fix it straight away, the others open the right section.
export function AtsCard({ ats, busy, onFix }) {
  return (
    <section className="cv-card ats-card" aria-labelledby="ats-title">
      <div className="ats-card__top">
        <AtsRing score={ats.score} />
        <div className="ats-card__words">
          <p className="overline">ATS check</p>
          <h2 className="ats-card__headline" id="ats-title">
            {scoreHeadline(ats.score)}
          </h2>
          <p className="ats-card__potential">{potentialText(ats.tips, ats.potential)}</p>
        </div>
      </div>
      {ats.tips.map((tip) => (
        <div className="ats-tip" key={tip.key}>
          <span className="ats-tip__gain" aria-label={`${tip.gain} points`}>
            +{tip.gain}
          </span>
          <p className="ats-tip__text">{tip.text}</p>
          <Button variant="secondary" onClick={() => onFix(tip)} disabled={busy}>
            {fixButtonText(tip)}
          </Button>
        </div>
      ))}
    </section>
  )
}
