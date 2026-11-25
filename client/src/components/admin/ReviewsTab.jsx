import { useCallback, useState } from 'react'
import { adminApi } from '../../services/AdminApi'
import { dayText, displayName } from '../../services/format'
import { Button } from '../Button'
import { Chip } from '../Chip'
import { Stars } from '../Stars'
import { TabStatus, UserCell, WarningDialog } from './AdminParts'
import { useAdminData } from './useAdminData'

const SERIOUS = ['Ghosted', 'No-show', 'Fake job / fake profile']

// FR-43: keep or remove a disputed review, and warn either side with the review as evidence
export function ReviewsTab() {
  const loader = useCallback(() => adminApi.disputes(), [])
  const { items, error, notice, busy, run } = useAdminData(loader)
  const [warning, setWarning] = useState(null) // { user, review }

  return (
    <>
      <TabStatus items={items} error={error} notice={notice} empty="No disputed reviews." />
      {items && items.length > 0 && (
        <ul className="admin-cards">
          {items.map((review) => (
            <li key={review.id} className="trust-card admin-card">
              <div className="admin-card__people">
                <span>
                  <span className="overline">Written by</span>
                  <UserCell user={review.reviewer} />
                </span>
                <span>
                  <span className="overline">About</span>
                  <UserCell user={review.reviewee} />
                </span>
              </div>
              <div className="admin-card__review">
                <Stars value={review.stars} />
                {review.tags.length > 0 && (
                  <span className="chip-row">
                    {review.tags.map((tag) => (
                      <Chip key={tag} state={SERIOUS.includes(tag) ? 'missing' : 'default'}>
                        {tag}
                      </Chip>
                    ))}
                  </span>
                )}
                {review.comment && <p className="review__comment">“{review.comment}”</p>}
                {review.reply && (
                  <p className="review__reply">
                    <strong>Reply:</strong> {review.reply}
                  </p>
                )}
                <p className="admin-user__sub">Posted {dayText(review.createdAt)}</p>
              </div>
              <div className="admin-actions">
                <Button onClick={() => run(() => adminApi.moderate(review.id, 'keep'), 'Review kept')} disabled={busy}>
                  Keep
                </Button>
                <Button variant="secondary" onClick={() => run(() => adminApi.moderate(review.id, 'remove'), 'Review removed')} disabled={busy}>
                  Remove
                </Button>
                {review.reviewee && (
                  <Button variant="ghost" onClick={() => setWarning({ user: review.reviewee, review })} disabled={busy}>
                    Warn {displayName(review.reviewee)}
                  </Button>
                )}
                {review.reviewer && (
                  <Button variant="ghost" onClick={() => setWarning({ user: review.reviewer, review })} disabled={busy}>
                    Warn the writer (fake or abusive)
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {warning && (
        <WarningDialog
          user={warning.user}
          review={warning.review}
          onCancel={() => setWarning(null)}
          onSubmit={async (body) => {
            await adminApi.warn(warning.user.id, body)
            setWarning(null)
            run(async () => {}, `Warning sent to ${displayName(warning.user)}`)
          }}
        />
      )}
    </>
  )
}
