import { Chip } from './Chip'
import './AuthLayout.css'

// H1's two halves: the form on the left, the green "how it works" panel on the right
export function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      <main className="auth-layout__form">
        <p className="auth-layout__logo">wuzzufny</p>
        {children}
      </main>

      <aside className="auth-layout__panel" aria-label="How Wuzzufny works">
        <div className="preview-card">
          <div className="preview-card__head">
            <span className="preview-card__logo" aria-hidden="true">NB</span>
            <span className="preview-card__company">
              <span className="preview-card__name">Nile Byte</span>
              <span className="preview-card__reply">Usually replies in 2 days</span>
            </span>
            <span className="preview-card__fit">82% fit</span>
          </div>
          <p className="preview-card__title">Junior Frontend Developer</p>
          <p className="preview-card__meta">EGP 14k–18k / month · Hybrid · Maadi</p>
          <div className="preview-card__chips">
            <Chip>React ✓</Chip>
            <Chip>JavaScript ✓</Chip>
          </div>
        </div>

        <ol className="auth-layout__steps">
          <li>1&nbsp;&nbsp;Swipe</li>
          <li>2&nbsp;&nbsp;Match</li>
          <li>3&nbsp;&nbsp;Chat</li>
        </ol>
        <p className="auth-layout__caption">A chat opens only when you both say yes.</p>
      </aside>
    </div>
  )
}
