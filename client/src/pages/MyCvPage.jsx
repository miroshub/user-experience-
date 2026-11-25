import { useEffect, useState } from 'react'
import { AppLayout } from '../components/AppLayout'
import { AtsCard } from '../components/AtsCard'
import { Button } from '../components/Button'
import { CvPreview } from '../components/CvPreview'
import { CvSectionDialog } from '../components/CvSectionDialog'
import { CvSections } from '../components/CvSections'
import { cvApi } from '../services/CvApi'
import { cvSubtitle } from '../services/cvText'
import { swipeApi } from '../services/SwipeApi'
import './MyCvPage.css'

// "about" in a fix means the summary section of the form
function sectionOf(action) {
  return action.section === 'about' ? 'summary' : action.section
}

function openBlob(blob, pending) {
  const url = URL.createObjectURL(blob)
  if (pending) pending.location.href = url
  else window.open(url, '_blank', 'noopener')
}

// H6 My CV + ATS check (FR-08 to FR-10)
export function MyCvPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(null) // { section, index }
  const [newMatches, setNewMatches] = useState(0)

  useEffect(() => {
    cvApi.get().then(setData).catch((err) => setError(err.message))
    swipeApi
      .matches()
      .then((matches) => setNewMatches(matches.filter((m) => m.status === 'matched').length))
      .catch(() => setNewMatches(0))
  }, [])

  // Every change answers with the new CV and score, so the page just swaps them in
  async function run(task, doneText) {
    setBusy(true)
    setNotice('')
    try {
      setData(await task())
      if (doneText) setNotice(doneText)
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  function fix(tip) {
    const { action } = tip
    if (action.type === 'open') {
      setEditing({ section: sectionOf(action), index: action.index })
      return
    }
    run(() => cvApi.fix(action), action.type === 'addSkill' ? `${action.skill} added to your skills.` : 'About me shortened.')
  }

  async function saveSection(changes) {
    // errors stay in the dialog, so the typing is not lost
    const next = await cvApi.save(changes)
    setData(next)
    setEditing(null)
    setNotice('Saved.')
  }

  // FR-10. The window opens first, so the browser does not block it as a pop-up.
  async function previewPdf() {
    const pending = window.open('', '_blank')
    try {
      openBlob(await cvApi.exportPdf(), pending)
    } catch (err) {
      pending?.close()
      setNotice(err.message)
    }
  }

  async function downloadPdf() {
    try {
      const url = URL.createObjectURL(await cvApi.exportPdf())
      const link = document.createElement('a')
      link.href = url
      link.download = `${data.cv.fullName.replace(/[^a-zA-Z0-9]+/g, '-')}-CV.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setNotice(err.message)
    }
  }

  async function openUploadedPdf() {
    const pending = window.open('', '_blank')
    try {
      openBlob(await cvApi.uploadedPdf(data.cv.pdfUrl), pending)
    } catch (err) {
      pending?.close()
      setNotice(err.message)
    }
  }

  if (!data) {
    return (
      <AppLayout newMatches={newMatches}>
        <p className="cv-page__loading" role={error ? 'alert' : 'status'}>
          {error || 'Loading your CV…'}
        </p>
      </AppLayout>
    )
  }

  const { cv, ats } = data
  const skillTip = ats.tips.find((tip) => tip.action.type === 'addSkill')

  return (
    <AppLayout newMatches={newMatches}>
      <div className="cv-page">
        <header className="cv-page__head">
          <div className="cv-page__titles">
            <h1 className="cv-page__title">My CV</h1>
            <p className="cv-page__subtitle">{cvSubtitle(cv, ats.checkedAgainst)}</p>
          </div>
          <Button variant="secondary" onClick={previewPdf}>
            Preview PDF
          </Button>
          <Button onClick={downloadPdf}>Download PDF</Button>
        </header>

        <div className="notice-area" role="status" aria-live="polite">
          {notice && <p className="notice">{notice}</p>}
        </div>

        <div className="cv-page__body">
          <div className="cv-page__left">
            <AtsCard ats={ats} busy={busy} onFix={fix} />
            <CvSections
              cv={cv}
              busy={busy}
              onOpen={(section) => setEditing({ section })}
              onUpload={(file) => run(() => cvApi.uploadPdf(file), 'Your PDF is uploaded.')}
              onOpenPdf={openUploadedPdf}
            />
          </div>
          <CvPreview cv={cv} missingSkill={skillTip?.action.skill} onAddSkill={() => fix(skillTip)} />
        </div>
      </div>

      {editing && (
        <CvSectionDialog
          section={editing.section}
          cv={cv}
          focusIndex={editing.index}
          onSave={saveSection}
          onClose={() => setEditing(null)}
        />
      )}
    </AppLayout>
  )
}
