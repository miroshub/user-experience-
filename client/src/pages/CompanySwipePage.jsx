import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import amberDot from '../assets/icons/dot-amber.svg'
import { AppLayout } from '../components/AppLayout'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { KeyHints } from '../components/KeyHints'
import { MatchDialog } from '../components/MatchDialog'
import { SegmentedControl } from '../components/SegmentedControl'
import { useAuth } from '../context/AuthContext'
import { useSwipeKeys } from '../hooks/useSwipeKeys'
import { displayName, initials, shortMoney, shortName, workModeText } from '../services/format'
import { jobApi } from '../services/JobApi'
import { swipeApi } from '../services/SwipeApi'
import './SwipePage.css'

const FEED_SIZE = 20

// The same words the server's spam rules use (FR-18). Two or more = "Check later".
const CHECK_LATER_RULES = ['Account less than 1 day old', 'Not verified', 'Interested in 50+ jobs today', 'Empty profile']

function countText(list) {
  return list.length >= FEED_SIZE ? `${FEED_SIZE}+` : String(list.length)
}

function CandidateCard({ card, flagged }) {
  return (
    <article className="swipe-card candidate-card" aria-label={`Candidate ${shortName(card.fullName)}`}>
      <div className="candidate-card__head">
        <span className="candidate-card__avatar" aria-hidden="true">
          {initials(card.fullName)}
        </span>
        <div className="candidate-card__who">
          <h2 className="candidate-card__name">
            {shortName(card.fullName)}
            {card.isVerified && (
              <>
                <Icon name="shield" />
                <span className="visually-hidden">Verified</span>
              </>
            )}
          </h2>
          {card.headline && <p className="candidate-card__line">{card.headline}</p>}
          {card.city && <p className="candidate-card__line">{card.city}</p>}
        </div>
      </div>

      <p className="candidate-card__fit">
        <span className="candidate-card__fit-label">CV match for this job</span>
        <span className="candidate-card__fit-number">{card.fit}%</span>
      </p>

      <p className="overline">Skills you asked for</p>
      <div className="chip-row">
        {card.whyItFits.map((skill) => (
          <Chip key={skill}>{skill} ✓</Chip>
        ))}
        {card.missingSkills.map((skill) => (
          <Chip key={skill} state="missing">
            {skill} · missing
          </Chip>
        ))}
      </div>

      {flagged && card.spamReasons.length > 0 && (
        <p className="candidate-card__quote">Moved aside because: {card.spamReasons.join(' · ')}</p>
      )}
    </article>
  )
}

// H9 Company swipes candidates (FR-16, FR-18)
export function CompanySwipePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [jobs, setJobs] = useState(null)
  const [tab, setTab] = useState('review')
  const [notice, setNotice] = useState(null)
  const [matches, setMatches] = useState([])
  const [matchWith, setMatchWith] = useState(null)
  const busy = useRef(false)

  const jobId = params.get('job') || jobs?.find((j) => j.status === 'live')?.id || jobs?.[0]?.id

  useEffect(() => {
    jobApi.listMine().then(setJobs).catch((error) => {
      setJobs([])
      setNotice(error.message)
    })
  }, [])

  const loadMatches = useCallback(() => {
    swipeApi.matches().then(setMatches).catch(() => setMatches([]))
  }, [])

  useEffect(() => {
    loadMatches()
  }, [loadMatches])

  // The feed remembers which job it is for, so switching jobs shows "Finding candidates…" until the new one arrives
  const [loadedFeed, setLoadedFeed] = useState(null)
  useEffect(() => {
    if (!jobId) return
    swipeApi
      .candidates(jobId, FEED_SIZE)
      .then((data) => setLoadedFeed({ ...data, forJob: jobId }))
      .catch((error) => setNotice(error.message))
  }, [jobId])
  const feed = loadedFeed?.forJob === jobId ? loadedFeed : null

  const listName = tab === 'review' ? 'candidates' : 'checkLater'
  const list = feed ? feed[listName] : []
  const top = list[0]

  // name is fixed when the swipe starts, so switching tabs mid-swipe cannot touch the wrong list
  function setList(name, update) {
    setLoadedFeed((current) => ({ ...current, [name]: update(current[name]) }))
  }

  async function swipe(interested) {
    if (!top || busy.current || matchWith) return
    busy.current = true
    setNotice(null)
    const name = listName
    setList(name, (current) => current.slice(1))
    try {
      const result = await swipeApi.swipe({ jobId, seekerId: top.id, interested })
      if (result.match) {
        setMatchWith(top)
        loadMatches()
      }
    } catch (error) {
      setList(name, (current) => [top, ...current.filter((c) => c.id !== top.id)])
      setNotice(error.message)
    } finally {
      busy.current = false
    }
  }

  useSwipeKeys({ onLeft: () => swipe(false), onRight: () => swipe(true), enabled: !matchWith })

  function pickJob(event) {
    if (event.target.value === 'new') navigate('/jobs/new')
    else setParams({ job: event.target.value })
  }

  const jobMatches = matches.filter((m) => m.jobId === jobId)
  const newMatches = matches.filter((m) => m.status === 'matched').length
  const job = feed?.job

  if (jobs && jobs.length === 0) {
    return (
      <AppLayout>
        <div className="empty-state">
          <h1 className="swipe-card__empty-title">Post a job to start finding people</h1>
          <p className="panel__text">Candidates appear here once you have a live job.</p>
          <Button onClick={() => navigate('/jobs/new')}>Post a job</Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout newMatches={newMatches}>
      <div className="swipe-page">
        <div className="swipe-page__toolbar">
          <div className="job-picker">
            <span className="job-picker__text">
              <label className="overline" htmlFor="job-picker">
                Hiring for
              </label>
              <select id="job-picker" className="job-picker__select" value={jobId || ''} onChange={pickJob}>
                {(jobs || []).map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                    {j.status !== 'live' ? ` (${j.status})` : ''}
                  </option>
                ))}
                <option value="new">+ Post a new job</option>
              </select>
            </span>
            <Icon name="chevron" />
          </div>
          <SegmentedControl
            label="Which candidates"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'review', label: `To review (${feed ? countText(feed.candidates) : '…'})` },
              { value: 'later', label: `Check later (${feed ? countText(feed.checkLater) : '…'})` },
            ]}
          />
          <span className="swipe-page__spacer" />
          <KeyHints keys={['← Pass', '→ Interested']} />
        </div>

        <div className="swipe-page__body">
          <div className="swipe-page__deck">
            <div className="card-stack card-stack--tall" data-left={Math.min(list.length, 3)}>
              <span className="card-stack__ghost card-stack__ghost--back" aria-hidden="true" />
              <span className="card-stack__ghost card-stack__ghost--middle" aria-hidden="true" />
              {top && <CandidateCard key={top.id} card={top} flagged={tab === 'later'} />}
              {!top && (
                <div className="swipe-card swipe-card--empty">
                  <p className="swipe-card__empty-title">{feed ? 'Nobody left to review' : 'Finding candidates…'}</p>
                  {feed && <p className="panel__text">New people sign up every day. Check back soon.</p>}
                </div>
              )}
            </div>

            <div className="notice-area" role="status" aria-live="polite">
              {notice && <p className="notice">{notice}</p>}
            </div>

            <div className="swipe-actions">
              <Button variant="secondary" size="lg" className="swipe-actions__no" onClick={() => swipe(false)} disabled={!top}>
                Pass
              </Button>
              <Button size="lg" className="swipe-actions__yes" onClick={() => swipe(true)} disabled={!top}>
                Interested
              </Button>
            </div>
          </div>

          <aside className="swipe-page__side">
            <section className="panel panel--tight" aria-labelledby="later-title">
              <div className="panel__head panel__head--icon">
                <Icon name="filter-amber" />
                <h2 className="panel__heading" id="later-title">
                  {feed ? countText(feed.checkLater) : '…'} in “Check later”
                </h2>
              </div>
              <p className="panel__text">We moved these aside because at least two of these were true:</p>
              <ul className="dot-list">
                {CHECK_LATER_RULES.map((rule) => (
                  <li key={rule}>
                    <img src={amberDot} alt="" />
                    {rule}
                  </li>
                ))}
              </ul>
              <p className="panel__text panel__text--strong">Nothing is deleted. You can still look at them.</p>
            </section>

            {job && (
              <section className="panel panel--stats" aria-labelledby="job-title">
                <p className="overline">This job</p>
                <h2 className="panel__heading" id="job-title">
                  {job.title}
                </h2>
                <p className="panel__text">
                  {[`EGP ${shortMoney(job.salaryMin)}–${shortMoney(job.salaryMax)}`, workModeText(job.workMode), job.city]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <div className="job-stats">
                  <p className="job-stats__item">
                    <span className="job-stats__number">{countText(feed.candidates)}</span>
                    <span className="panel__text">to review</span>
                  </p>
                  <p className="job-stats__item">
                    <span className="job-stats__number">{jobMatches.length}</span>
                    <span className="panel__text">matched</span>
                  </p>
                  <p className="job-stats__item">
                    <span className="job-stats__number">{jobMatches.filter((m) => m.status === 'interview').length}</span>
                    <span className="panel__text">interview</span>
                  </p>
                </div>
                <Link className="panel__link" to={`/jobs/${job.id}/edit`}>
                  Edit job →
                </Link>
              </section>
            )}
          </aside>
        </div>
      </div>

      {matchWith && (
        <MatchDialog
          you={{ name: displayName(user), shape: 'square' }}
          them={{ name: shortName(matchWith.fullName), shape: 'round' }}
          jobTitle={job?.title || 'this job'}
          onKeepSwiping={() => setMatchWith(null)}
          onSayHi={() => navigate('/matches')}
        />
      )}
    </AppLayout>
  )
}
