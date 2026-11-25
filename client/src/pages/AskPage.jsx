import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { AskJobRow } from '../components/AskJobRow'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { assistantApi } from '../services/AssistantApi'
import { filterChips, jobCountText, withoutChip } from '../services/filters'
import { swipeApi } from '../services/SwipeApi'
import './AskPage.css'

const SUGGESTIONS = ['Internships that start after June', 'Which jobs fit my CV best?']

// H7 Ask wuzzufny (FR-19 to FR-21): type in normal words, get filter chips and the jobs that match
export function AskPage() {
  const [data, setData] = useState(null) // { turns, filters, results }
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showJobs, setShowJobs] = useState(false)
  const [notice, setNotice] = useState(null)
  const [newMatches, setNewMatches] = useState(0)
  const endRef = useRef(null)

  useEffect(() => {
    assistantApi
      .open()
      .then((answer) => {
        setData(answer)
        // coming back to the page: the jobs for the last filters are shown straight away
        setShowJobs(answer.turns.length > 0)
      })
      .catch((err) => setNotice({ text: err.message }))
    swipeApi
      .matches()
      .then((matches) => setNewMatches(matches.filter((m) => m.status === 'matched').length))
      .catch(() => setNewMatches(0))
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [data?.turns.length])

  async function ask(question) {
    const clean = question.trim()
    if (!clean || sending) return
    setSending(true)
    setNotice(null)
    try {
      setData(await assistantApi.ask(clean))
      setText('')
    } catch (err) {
      setNotice({ text: err.message })
    } finally {
      setSending(false)
    }
  }

  async function removeChip(key) {
    try {
      setData(await assistantApi.setFilters(withoutChip(data.filters, key)))
    } catch (err) {
      setNotice({ text: err.message })
    }
  }

  // Interested or Skip straight from the list, like on the swipe page
  async function swipe(job, interested) {
    setNotice(null)
    try {
      const result = await swipeApi.swipe({ jobId: job.id, interested })
      setData((current) => ({
        ...current,
        results: {
          ...current.results,
          total: current.results.total - 1,
          jobs: current.results.jobs.filter((j) => j.id !== job.id),
        },
      }))
      if (result.match) {
        setNotice({ text: `It's a match with ${job.company?.name || 'the company'}!`, link: { to: `/matches/${result.match.id}`, text: 'Say hi' } })
      }
    } catch (err) {
      setNotice({ text: err.message, link: err.code === 'VERIFY_REQUIRED' ? { to: '/profile', text: 'Verify my ID' } : null })
    }
  }

  function submit(event) {
    event.preventDefault()
    ask(text)
  }

  const turns = data?.turns || []
  const chips = data ? filterChips(data.filters) : []
  const results = data?.results
  const tip = results?.tip

  return (
    <AppLayout newMatches={newMatches}>
      <div className="ask-page">
        <section className="ask-chat" aria-labelledby="ask-title">
          <div className="ask-chat__head">
            <h1 className="ask-chat__title" id="ask-title">
              Ask wuzzufny
            </h1>
            <p className="ask-chat__subtitle">Say what you want in your own words. We’ll set the filters.</p>
          </div>

          <div className="ask-chat__log" aria-live="polite">
            {turns.map((turn, index) => {
              const last = index === turns.length - 1
              return (
                <div className="ask-turn" key={`${index}-${turn.userMessage}`}>
                  <p className="ask-bubble ask-bubble--me">{turn.userMessage}</p>
                  <div className="ask-bubble ask-bubble--ai">
                    <p>{turn.aiReply}</p>
                    {last && chips.length > 0 && (
                      <div className="chip-row" aria-label="Your filters">
                        {chips.map((chip) => (
                          <Chip key={chip.key} state="selected" onClick={() => removeChip(chip.key)} aria-label={`Remove filter ${chip.text}`}>
                            {chip.text} <span aria-hidden="true">×</span>
                          </Chip>
                        ))}
                      </div>
                    )}
                    {last && results && (
                      <Button className="ask-bubble__show" onClick={() => setShowJobs(true)}>
                        Show {results.total} {results.total === 1 ? 'job' : 'jobs'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {tip && turns.length > 0 && (
              <p className="ask-tip">
                <Icon name="bulb" />
                <span>
                  Heads up: {tip.count} of these ask for {tip.skill}. If you know it, <Link to="/cv">add it to your CV</Link>.
                </span>
              </p>
            )}
            <span ref={endRef} />
          </div>

          <div className="ask-chat__notice" role="status">
            {notice && (
              <p className="notice">
                {notice.text}
                {notice.link && (
                  <>
                    {' '}
                    <Link to={notice.link.to}>{notice.link.text}</Link>
                  </>
                )}
              </p>
            )}
          </div>

          <p className="overline">Try asking</p>
          <div className="ask-suggestions">
            {SUGGESTIONS.map((suggestion) => (
              <button type="button" className="ask-suggestion" key={suggestion} onClick={() => ask(suggestion)} disabled={sending}>
                “{suggestion}”
              </button>
            ))}
          </div>

          <form className="ask-input" onSubmit={submit}>
            <label className="visually-hidden" htmlFor="ask-text">
              Ask for jobs in your own words
            </label>
            <input
              id="ask-text"
              className="ask-input__box"
              placeholder="Ask for jobs in your own words"
              value={text}
              maxLength={500}
              onChange={(event) => setText(event.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="ask-input__send" aria-label="Send" disabled={sending}>
              <Icon name="send" />
            </button>
          </form>
        </section>

        <section className="ask-results" aria-labelledby="results-title">
          {showJobs && results ? (
            <>
              <div className="ask-results__head">
                <h2 className="ask-results__title" id="results-title">
                  {jobCountText(results.total)}
                </h2>
                <p className="ask-results__sort">Sorted by: best fit</p>
              </div>
              {results.jobs.length === 0 && <p className="ask-results__empty">No jobs match right now. Try removing a filter.</p>}
              {results.jobs.map((job) => (
                <AskJobRow key={job.id} job={job} onSwipe={swipe} />
              ))}
            </>
          ) : (
            <p className="ask-results__empty" id="results-title">
              {sending ? 'Looking for jobs…' : 'Your matching jobs show here.'}
            </p>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
