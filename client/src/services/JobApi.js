import { api } from './ApiClient'

// Everything a company does with its own jobs (FR-30 to FR-32)
export class JobApi {
  listMine() {
    return api.get('/api/jobs/mine')
  }

  get(jobId) {
    return api.get(`/api/jobs/${jobId}`)
  }

  create(fields) {
    return api.post('/api/jobs', fields)
  }

  edit(jobId, changes) {
    return api.patch(`/api/jobs/${jobId}`, changes)
  }

  pause(jobId) {
    return api.post(`/api/jobs/${jobId}/pause`)
  }

  resume(jobId) {
    return api.post(`/api/jobs/${jobId}/resume`)
  }

  close(jobId) {
    return api.post(`/api/jobs/${jobId}/close`)
  }

  uploadImage(jobId, file) {
    const form = new FormData()
    form.append('image', file)
    return api.post(`/api/jobs/${jobId}/image`, form)
  }
}

export const jobApi = new JobApi()
