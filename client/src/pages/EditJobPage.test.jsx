import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditJobPage } from './EditJobPage'
import { jobApi } from '../services/JobApi'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'c1', fullName: 'Nile HR', companyName: 'Nile Tech', role: 'company', location: 'Cairo' } }),
}))
vi.mock('../services/JobApi', () => ({
  jobApi: { get: vi.fn(), edit: vi.fn(), create: vi.fn(), pause: vi.fn(), resume: vi.fn(), close: vi.fn(), uploadImage: vi.fn() },
}))

const job = {
  id: 'j1',
  title: 'Junior Frontend Developer',
  salaryMin: 14000,
  salaryMax: 18000,
  workMode: 'hybrid',
  city: 'Maadi',
  skills: ['React', 'JavaScript'],
  description: 'Build screens.',
  imageUrl: null,
  status: 'live',
}

function showPage(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/jobs/new" element={<EditJobPage />} />
        <Route path="/jobs/:id/edit" element={<EditJobPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('H10 Edit a live job', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    jobApi.get.mockResolvedValue(job)
  })

  it('fills the form and the preview from the saved job', async () => {
    showPage('/jobs/j1/edit')
    expect(await screen.findByLabelText('Job title')).toHaveValue('Junior Frontend Developer')
    expect(screen.getByLabelText('Lowest salary')).toHaveValue('14,000')
    expect(screen.getByRole('radio', { name: 'Hybrid' })).toBeChecked()
    expect(screen.getByText('EGP 14k–18k / month')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('saves the edited fields as numbers and a skill list', async () => {
    jobApi.edit.mockImplementation(async (id, changes) => ({ ...job, ...changes }))
    showPage('/jobs/j1/edit')
    const title = await screen.findByLabelText('Job title')

    await userEvent.clear(title)
    await userEvent.type(title, 'Frontend Developer')
    await userEvent.click(screen.getByRole('button', { name: 'Remove JavaScript' }))
    await userEvent.click(screen.getByRole('button', { name: '+ Add skill' }))
    await userEvent.type(screen.getByLabelText('New skill'), 'Git{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(jobApi.edit).toHaveBeenCalledWith('j1', {
      title: 'Frontend Developer',
      salaryMin: 14000,
      salaryMax: 18000,
      workMode: 'hybrid',
      city: 'Maadi',
      skills: ['React', 'Git'],
      description: 'Build screens.',
    })
    expect(await screen.findByText('Changes saved. They are live now.')).toBeInTheDocument()
  })

  it('shows the server message when a save is refused', async () => {
    jobApi.edit.mockRejectedValue(new Error('Minimum salary cannot be above the maximum'))
    showPage('/jobs/j1/edit')
    await screen.findByLabelText('Job title')

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Minimum salary cannot be above the maximum')).toBeInTheDocument()
  })

  it('pauses a live job', async () => {
    jobApi.pause.mockResolvedValue({ ...job, status: 'paused' })
    showPage('/jobs/j1/edit')
    await userEvent.click(await screen.findByRole('button', { name: 'Pause job' }))

    expect(jobApi.pause).toHaveBeenCalledWith('j1')
    expect(await screen.findByRole('button', { name: 'Resume job' })).toBeInTheDocument()
  })

  it('hides the city box for remote jobs and sends an empty city', async () => {
    jobApi.create.mockResolvedValue({ ...job, id: 'j9' })
    showPage('/jobs/new')

    await userEvent.type(screen.getByLabelText('Job title'), 'QA Tester')
    await userEvent.type(screen.getByLabelText('Lowest salary'), '10000')
    await userEvent.type(screen.getByLabelText('Highest salary'), '13000')
    await userEvent.click(screen.getByRole('radio', { name: 'Remote' }))
    expect(screen.queryByLabelText('City or area')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Post job' }))

    expect(jobApi.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'QA Tester', salaryMin: 10000, workMode: 'remote', city: '' }))
  })
})
