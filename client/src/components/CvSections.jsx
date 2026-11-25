import { useRef } from 'react'
import { sectionStatus } from '../services/cvText'
import { Icon } from './Icon'

const ROWS = [
  { key: 'summary', label: 'About me' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'skills', label: 'Skills' },
]

// H6 section list: each row opens that part of the form (FR-08).
// The last row is the "or upload a PDF" part of FR-08, which has no Figma frame: it reuses the same row.
export function CvSections({ cv, busy, onOpen, onUpload, onOpenPdf }) {
  const fileRef = useRef(null)
  const status = sectionStatus(cv)

  function pickFile(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (file) onUpload(file)
  }

  return (
    <section className="cv-card cv-sections" aria-label="CV sections">
      {ROWS.map((row) => (
        <button type="button" className="cv-row" key={row.key} onClick={() => onOpen(row.key)}>
          <span className="cv-row__label">{row.label}</span>
          <span className={`cv-row__status${status[row.key].warn ? ' cv-row__status--warn' : ''}`}>{status[row.key].text}</span>
          <Icon name="chevron" />
        </button>
      ))}
      <div className="cv-row cv-row--static">
        <span className="cv-row__label">PDF CV</span>
        {cv.pdfUrl && (
          <button type="button" className="cv-row__link" onClick={onOpenPdf}>
            View uploaded PDF
          </button>
        )}
        <button type="button" className="cv-row__link" onClick={() => fileRef.current.click()} disabled={busy}>
          {cv.pdfUrl ? 'Replace' : 'Upload a PDF'}
        </button>
        <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={pickFile} aria-label="Upload a PDF CV" />
      </div>
    </section>
  )
}
