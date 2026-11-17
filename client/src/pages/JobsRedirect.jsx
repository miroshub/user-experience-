import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { jobApi } from '../services/JobApi'

// "Jobs" in the company sidebar: there is no job list frame yet, so it opens the newest job,
// or the "Post a job" form when the company has none
export function JobsRedirect() {
  const [target, setTarget] = useState(null)

  useEffect(() => {
    jobApi
      .listMine()
      .then((jobs) => setTarget(jobs.length > 0 ? `/jobs/${jobs[0].id}/edit` : '/jobs/new'))
      .catch(() => setTarget('/jobs/new'))
  }, [])

  return target ? <Navigate to={target} replace /> : null
}
