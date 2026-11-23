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
import matchesOn from '../assets/icons/matches-on.svg'
import calendar from '../assets/icons/calendar.svg'
import calendarSmall from '../assets/icons/calendar-small.svg'
import calendarDark from '../assets/icons/calendar-dark.svg'
import timer from '../assets/icons/timer.svg'
import timerSmall from '../assets/icons/timer-small.svg'
import video from '../assets/icons/video.svg'
import send from '../assets/icons/send.svg'
import check from '../assets/icons/check.svg'
import close from '../assets/icons/close.svg'
import personSmall from '../assets/icons/person-small.svg'
import bellSmall from '../assets/icons/bell-small.svg'
import clockAmber from '../assets/icons/clock-amber.svg'
import chatSmall from '../assets/icons/chat-small.svg'
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
  // H4 and H5
  'matches-on': { src: matchesOn, box: 24, x: 3, y: 4 },
  calendar: { src: calendar, box: 18, x: 2, y: 1.25 },
  'calendar-small': { src: calendarSmall, box: 16, x: 1.667, y: 1 },
  'calendar-dark': { src: calendarDark, box: 16, x: 1.667, y: 1 },
  timer: { src: timer, box: 18, x: 2, y: 0.5 },
  'timer-small': { src: timerSmall, box: 16, x: 1.667, y: 0.333 },
  video: { src: video, box: 16, x: 1, y: 3 },
  send: { src: send, box: 20, x: 2.333, y: 2.333 },
  check: { src: check, box: 14, x: 1.917, y: 3.375 },
  close: { src: close, box: 18, x: 3.5, y: 3.5 },
  'person-small': { src: personSmall, box: 16, x: 1.667, y: 1.667 },
  'bell-small': { src: bellSmall, box: 16, x: 1, y: 0.333 },
  'clock-amber': { src: clockAmber, box: 16, x: 1, y: 1 },
  'chat-small': { src: chatSmall, box: 16, x: 1.667, y: 2.333 },
}

export function Icon({ name, className = '' }) {
  const icon = ICONS[name]
  return (
    <span className={`icon ${className}`} style={{ width: icon.box, height: icon.box }} aria-hidden="true">
      <img src={icon.src} alt="" style={{ left: icon.x, top: icon.y }} />
    </span>
  )
}
