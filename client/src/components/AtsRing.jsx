// H6 "ATS ring": 112 across, a 9px grey track and a green arc from the top, clockwise.
// Drawn with two SVG circles because the arc length depends on the score.
const SIZE = 112
const THICKNESS = 8.96
const RADIUS = (SIZE - THICKNESS) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function AtsRing({ score }) {
  const filled = (CIRCUMFERENCE * Math.max(0, Math.min(100, score))) / 100
  return (
    <div className="ats-ring" role="img" aria-label={`ATS score ${score} out of 100`}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--border-default)" strokeWidth={THICKNESS} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--brand-primary)"
          strokeWidth={THICKNESS}
          strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <span className="ats-ring__score" aria-hidden="true">
        {score}
      </span>
      <span className="ats-ring__out" aria-hidden="true">
        / 100
      </span>
    </div>
  )
}
