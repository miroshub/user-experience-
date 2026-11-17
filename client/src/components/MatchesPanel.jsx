import { Link } from 'react-router-dom'
import { matchLabel } from '../services/format'
import { StatusBar } from './StatusBar'
import './Panel.css'

// H2 right column, "Your matches": the 3 newest, each with its status bar and a text label
export function MatchesPanel({ matches }) {
  const shown = matches.slice(0, 3)
  return (
    <section className="panel" aria-labelledby="matches-title">
      <div className="panel__head">
        <h2 className="panel__heading" id="matches-title">
          Your matches
        </h2>
        <Link className="panel__link" to="/matches">
          See all
        </Link>
      </div>
      {shown.length === 0 && <p className="panel__text">No matches yet. Say Interested to a job you like.</p>}
      {shown.map((match) => {
        const label = matchLabel(match)
        return (
          <div className="match-row" key={match.id}>
            <p className="match-row__title">
              <span className="match-row__job">{match.job?.title || 'Job removed'}</span>
              <span className="match-row__with"> · {match.with?.name || 'Deleted user'}</span>
            </p>
            <StatusBar status={match.status} waiting={match.isWaiting} />
            <p className={`match-row__label match-row__label--${label.tone}`}>{label.text}</p>
          </div>
        )
      })}
    </section>
  )
}
