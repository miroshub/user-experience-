import swipeOn from '../assets/icons/swipe-on.svg'
import swipeOff from '../assets/icons/swipe-off.svg'
import matches from '../assets/icons/matches.svg'
import cv from '../assets/icons/cv.svg'
import profile from '../assets/icons/profile.svg'
import jobsOn from '../assets/icons/jobs-on.svg'
import jobsOff from '../assets/icons/jobs-off.svg'
import filter from '../assets/icons/filter.svg'
import filterAmber from '../assets/icons/filter-amber.svg'
import shield from '../assets/icons/shield.svg'
import shieldSmall from '../assets/icons/shield-small.svg'
import undo from '../assets/icons/undo.svg'
import clock from '../assets/icons/clock.svg'
import chevron from '../assets/icons/chevron.svg'
import back from '../assets/icons/back.svg'
import image from '../assets/icons/image.svg'
import bell from '../assets/icons/bell.svg'
import './Icon.css'

// Figma line icons. Each SVG keeps its own size; x and y place it inside the icon box
// exactly where the Figma frame puts it.
const ICONS = {
  'swipe-on': { src: swipeOn, box: 24, x: 2, y: 2 },
  'swipe-off': { src: swipeOff, box: 24, x: 2, y: 2 },
  matches: { src: matches, box: 24, x: 3, y: 4 },
  cv: { src: cv, box: 24, x: 5, y: 2 },
  profile: { src: profile, box: 24, x: 3, y: 3 },
  'jobs-on': { src: jobsOn, box: 24, x: 2, y: 3.5 },
  'jobs-off': { src: jobsOff, box: 24, x: 2, y: 3.5 },
  filter: { src: filter, box: 18, x: 2, y: 4.25 },
  'filter-amber': { src: filterAmber, box: 18, x: 2, y: 4.25 },
  shield: { src: shield, box: 18, x: 2, y: 1.25 },
  'shield-small': { src: shieldSmall, box: 16, x: 1.667, y: 1 },
  undo: { src: undo, box: 20, x: 2.333, y: 2.333 },
  clock: { src: clock, box: 18, x: 1.25, y: 1.25 },
  chevron: { src: chevron, box: 18, x: 5.75, y: 3.5 },
  back: { src: back, box: 18, x: 5.75, y: 3.5 },
  image: { src: image, box: 16, x: 1, y: 1.667 },
  bell: { src: bell, box: 18, x: 1.25, y: 0.5 },
}

export function Icon({ name, className = '' }) {
  const icon = ICONS[name]
  return (
    <span className={`icon ${className}`} style={{ width: icon.box, height: icon.box }} aria-hidden="true">
      <img src={icon.src} alt="" style={{ left: icon.x, top: icon.y }} />
    </span>
  )
}
