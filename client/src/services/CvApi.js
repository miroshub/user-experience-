import { api } from './ApiClient'

// H6 My CV (FR-08 to FR-10). Every call answers { cv, ats } so the page always shows the new score.
export class CvApi {
  get() {
    return api.get('/api/cv')
  }

  // changes: any of { summary, experience, education, skills }
  save(changes) {
    return api.patch('/api/cv', changes)
  }

  // A one-click fix: { type: 'addSkill', skill } or { type: 'shortenSummary' }
  fix(action) {
    return api.post('/api/cv/fixes', action)
  }

  uploadPdf(file) {
    const form = new FormData()
    form.append('cv', file)
    return api.post('/api/cv/pdf', form)
  }

  // The PDF as a Blob. A plain link cannot send the login token, so the file is fetched first.
  exportPdf() {
    return api.getFile('/api/cv/export')
  }

  // The PDF the seeker uploaded (a private file)
  uploadedPdf(url) {
    return api.getFile(url)
  }
}

export const cvApi = new CvApi()
