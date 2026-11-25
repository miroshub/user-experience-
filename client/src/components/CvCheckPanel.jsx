import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cvApi } from '../services/CvApi'
import { potentialText } from '../services/cvText'

// H2 right column, "CV CHECK": the ATS score and a link to H6 (FR-09)
export function CvCheckPanel() {
  const [ats, setAts] = useState(null)

  useEffect(() => {
    cvApi
      .get()
      .then((data) => setAts(data.ats))
      .catch(() => setAts(null))
  }, [])

  if (!ats) return null

  return (
    <section className="panel panel--tight" aria-labelledby="cv-check-title">
      <h2 className="overline" id="cv-check-title">
        CV check
      </h2>
      <p className="cv-check__score">
        <span className="cv-check__number">{ats.score}</span>
        <span className="panel__text">/ 100</span>
      </p>
      <p className="panel__text">{potentialText(ats.tips, ats.potential, true)}</p>
      <Link className="panel__link" to="/cv">
        Fix my CV →
      </Link>
    </section>
  )
}
