import { Link } from 'react-router-dom'
import { barStatus, matchLabel, placeText, shortName } from '../services/format'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { SegmentedControl } from './SegmentedControl'
import { StatusBar } from './StatusBar'

// H4 left column: "Matches", Active / Closed, one card per match with its status bar and words
export function MatchList({ matches, side, selectedId, tab, onTab }) {
  const active = matches.filter((m) => m.status !== 'closed')
  const closed = matches.filter((m) => m.status === 'closed')
  const shown = tab === 'closed' ? closed : active

  return (
    <section className="match-list" aria-labelledby="matches-heading">
      <h1 className="match-list__title" id="matches-heading">
        Matches
      </h1>
      <SegmentedControl
        label="Which matches"
        size="fill"
        value={tab}
        onChange={onTab}
        options={[
          { value: 'active', label: `Active (${active.length})` },
          { value: 'closed', label: `Closed (${closed.length})` },
        ]}
      />
      {shown.length === 0 && (
        <p className="match-list__empty">
          {tab === 'closed' ? 'No closed matches.' : 'No matches yet. Keep swiping: when you both say yes, the chat opens here.'}
        </p>
      )}
      <ul className="match-list__items">
        {shown.map((match) => (
          <li key={match.id}>
            <MatchCard match={match} side={side} selected={match.id === selectedId} />
          </li>
        ))}
      </ul>
      <p className="match-list__legend">Matched → Chatting → Interview → Offer → Hired</p>
    </section>
  )
}

function MatchCard({ match, side, selected }) {
  const label = matchLabel(match, side)
  const other = match.with || { name: 'Deleted user', role: side === 'seeker' ? 'company' : 'seeker' }
  const title = side === 'seeker' ? match.job?.title || 'Job removed' : shortName(other.name)
  const subtitle = side === 'seeker' ? [other.name, match.job && placeText(match.job).split(' · ').pop()].filter(Boolean).join(' · ') : match.job?.title

  return (
    <Link
      to={`/matches/${match.id}`}
      className={`match-card${selected ? ' match-card--selected' : ''}`}
      aria-current={selected ? 'page' : undefined}
    >
      <span className="match-card__head">
        <Avatar name={other.name} id={other.id} role={other.role} />
        <span className="match-card__names">
          <span className="match-card__title">{title}</span>
          <span className="match-card__subtitle">{subtitle}</span>
        </span>
      </span>
      <StatusBar status={barStatus(match)} waiting={label.tone === 'pending'} />
      <span className={`match-card__label match-card__label--${label.tone}`}>
        {label.icon && <Icon name={label.icon} />}
        {label.text}
      </span>
    </Link>
  )
}
