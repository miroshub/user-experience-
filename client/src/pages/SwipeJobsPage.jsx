import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { FilterPanel } from '../components/FilterPanel'
import { Icon } from '../components/Icon'
import { JobCard } from '../components/JobCard'
import { KeyHints } from '../components/KeyHints'
import { MatchDialog } from '../components/MatchDialog'
import { MatchesPanel } from '../components/MatchesPanel'
import { useAuth } from '../context/AuthContext'
import { useSwipeKeys } from '../hooks/useSwipeKeys'
import { shortMoney, workModeText } from '../services/format'
import { swipeApi } from '../services/SwipeApi'
import './SwipePage.css'

const REFILL_BELOW = 3 // fetch more cards when fewer than this are left

// The words on each active filter chip
function filterChips(filters) {
  const chips = []
  if (filters.role) chips.push({ key: 'role', text: filters.role })
  if (filters.city) chips.push({ key: 'city', text: filters.city })
  if (filters.workMode) chips.push({ key: 'workMode', text: workModeText(filters.workMode) })
  if (filters.minSalary !== undefined) chips.push({ key: 'minSalary', text: `${shortMoney(filters.minSalary)}+ EGP` })
  return chips
}

// The server sends a code with some refusals; these get a friendlier message with a next step
function noticeFor(error) {
  if (error.code === 'VERIFY_REQUIRED') return { text: error.message, link: { to: '/profile', text: 'Verify my ID' } }
  return { text: error.message }
}

// H2 Swipe jobs + H3 It's a match (FR-12 to FR-15)
export function SwipeJobsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [notice, setNotice] = useState(null)
  const [matchCard, setMatchCard] = useState(null)
  const [matches, setMatches] = useState([])
  const busy = useRef(false) // stops a second swipe while the first is still being sent
  const swiped = useRef([]) // cards already swiped, so undo can show the full card again
  const gone = useRef(new Set()) // ids swiped in this visit; a late refill must not bring them back

  const loadMatches = useCallback(() => {
    swipeApi.matches().then(setMatches).catch(() => setMatches([]))
  }, [])

  // replace = new filters, so start again; otherwise add new cards to the end
  const loadCards = useCallback(async (activeFilters, replace) => {
    try {
      const fresh = (await swipeApi.jobCards(activeFilters)).filter((c) => !gone.current.has(c.id))
      setCards((current) => {
        if (replace) return fresh
        const known = new Set(current.map((c) => c.id))
        return [...current, ...fresh.filter((c) => !known.has(c.id))]
      })
    } catch (error) {
      setNotice({ text: error.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCards(filters, true)
  }, [filters, loadCards])

  useEffect(() => {
    loadMatches()
  }, [loadMatches])

  async function swipe(interested) {
    const card = cards[0]
    if (!card || busy.current || matchCard) return
    busy.current = true
    setNotice(null)
    gone.current.add(card.id)
    const rest = cards.slice(1)
    setCards(rest)

    try {
      const result = await swipeApi.swipe({ jobId: card.id, interested })
      swiped.current.push(card)
      if (result.match) {
        setMatchCard(card)
        loadMatches()
      }
      if (rest.length < REFILL_BELOW) loadCards(filters, false)
    } catch (error) {
      gone.current.delete(card.id)
      setCards((current) => [card, ...current.filter((c) => c.id !== card.id)])
      setNotice(noticeFor(error))
    } finally {
      busy.current = false
    }
  }

  // FR-14: the last swipe comes back to the top of the stack
  async function undo() {
    if (busy.current || matchCard) return
    busy.current = true
    setNotice(null)
    try {
      const job = await swipeApi.undo()
      const saved = swiped.current.find((c) => c.id === job.id)
      swiped.current = swiped.current.filter((c) => c.id !== job.id)
      gone.current.delete(job.id)
      const card = saved || { ...job, whyItFits: [], missingSkills: [], company: null }
      setCards((current) => [card, ...current.filter((c) => c.id !== job.id)])
    } catch (error) {
      setNotice({ text: error.message })
    } finally {
      busy.current = false
    }
  }

  useSwipeKeys({
    onLeft: () => swipe(false),
    onRight: () => swipe(true),
    onUndo: undo,
    enabled: !showFilters && !matchCard,
  })

  function applyFilters(next) {
    setShowFilters(false)
    setLoading(true)
    setFilters(next)
  }

  function removeFilter(key) {
    const next = { ...filters }
    delete next[key]
    applyFilters(next)
  }

  const top = cards[0]
  const chips = filterChips(filters)
  const newMatches = matches.filter((m) => m.status === 'matched').length

  return (
    <AppLayout newMatches={newMatches}>
      <div className="swipe-page">
        <div className="swipe-page__toolbar">
          <button
            type="button"
            className="toolbar-button"
            aria-expanded={showFilters}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Icon name="filter" />
            Filters
          </button>
          <span className="swipe-page__spacer" />
          <KeyHints keys={['← Skip', '→ Interested', 'Z Undo']} />
        </div>

        {showFilters && <FilterPanel filters={filters} onApply={applyFilters} onClose={() => setShowFilters(false)} />}

        {chips.length > 0 && (
          <div className="chip-row" aria-label="Active filters">
            {chips.map((chip) => (
              <Chip key={chip.key} state="selected" onClick={() => removeFilter(chip.key)} aria-label={`Remove filter ${chip.text}`}>
                {chip.text} <span aria-hidden="true">×</span>
              </Chip>
            ))}
          </div>
        )}

        <div className="swipe-page__body">
          <div className="swipe-page__deck">
            <div className="card-stack" data-left={Math.min(cards.length, 3)}>
              <span className="card-stack__ghost card-stack__ghost--back" aria-hidden="true" />
              <span className="card-stack__ghost card-stack__ghost--middle" aria-hidden="true" />
              {top && <JobCard key={top.id} card={top} />}
              {!top && (
                <div className="swipe-card swipe-card--empty">
                  <p className="swipe-card__empty-title">{loading ? 'Finding jobs for you…' : 'No more jobs right now'}</p>
                  {!loading && (
                    <p className="panel__text">
                      {chips.length > 0 ? 'Try removing a filter.' : 'New jobs are posted every day. Come back soon.'}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="notice-area" role="status" aria-live="polite">
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

            <div className="swipe-actions">
              <button type="button" className="swipe-actions__undo" onClick={undo} aria-label="Undo last swipe">
                <Icon name="undo" />
              </button>
              <Button variant="secondary" size="lg" className="swipe-actions__no" onClick={() => swipe(false)} disabled={!top}>
                Skip
              </Button>
              <Button size="lg" className="swipe-actions__yes" onClick={() => swipe(true)} disabled={!top}>
                Interested
              </Button>
            </div>
          </div>

          <aside className="swipe-page__side">
            <MatchesPanel matches={matches} />
          </aside>
        </div>
      </div>

      {matchCard && (
        <MatchDialog
          you={{ name: user.fullName, shape: 'round' }}
          them={{ name: matchCard.company?.name || 'the company', shape: 'square' }}
          jobTitle={matchCard.title}
          onKeepSwiping={() => setMatchCard(null)}
          onSayHi={() => navigate('/matches')}
        />
      )}
    </AppLayout>
  )
}
