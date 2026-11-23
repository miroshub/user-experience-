import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { displayName, initials } from '../services/format'
import { Icon } from './Icon'
import './AppLayout.css'

// Figma "Sidebar / Seeker" and "Sidebar / Company". The list is chosen by role,
// so a new kind of user is one more entry here (Open/Closed).
const NAV = {
  seeker: [
    { to: '/swipe', label: 'Swipe', icon: 'swipe' },
    { to: '/matches', label: 'Matches', icon: 'matches', showBadge: true },
    { to: '/cv', label: 'My CV', icon: 'cv' },
    { to: '/profile', label: 'Profile', icon: 'profile' },
  ],
  company: [
    { to: '/swipe', label: 'Swipe', icon: 'swipe' },
    { to: '/matches', label: 'Matches', icon: 'matches', showBadge: true },
    { to: '/jobs', label: 'Jobs', icon: 'jobs' },
    { to: '/profile', label: 'Profile', icon: 'profile' },
  ],
}

const ROLE_TEXT = { seeker: 'Job seeker', company: 'Company', admin: 'Admin' }

// Swipe, jobs and matches have a green "on" icon in Figma; My CV and Profile stay grey for now
function iconName(icon, active) {
  if (icon === 'swipe' || icon === 'jobs') return `${icon}-${active ? 'on' : 'off'}`
  if (icon === 'matches' && active) return 'matches-on'
  return icon
}

// flush: no padding, for pages whose columns run edge to edge (H4 Matches)
export function AppLayout({ newMatches = 0, flush = false, children }) {
  const { user } = useAuth()
  const items = NAV[user.role] || []
  const name = displayName(user)

  return (
    <div className="app-layout">
      <nav className="sidebar" aria-label="Main">
        <p className="sidebar__logo">wuzzufny</p>
        <ul className="sidebar__list">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className="nav-item">
                {({ isActive }) => (
                  <>
                    <Icon name={iconName(item.icon, isActive)} />
                    <span className="nav-item__label">{item.label}</span>
                    {item.showBadge && newMatches > 0 && (
                      <span className="nav-item__badge" aria-label={`${newMatches} new`}>
                        {newMatches}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sidebar__user">
          <span className={`sidebar__avatar sidebar__avatar--${user.role}`} aria-hidden="true">
            {initials(name)}
          </span>
          <span className="sidebar__who">
            <span className="sidebar__name">{name}</span>
            <span className="sidebar__role">{ROLE_TEXT[user.role]}</span>
          </span>
        </div>
      </nav>
      <main className={`app-layout__main${flush ? ' app-layout__main--flush' : ''}`}>{children}</main>
    </div>
  )
}
