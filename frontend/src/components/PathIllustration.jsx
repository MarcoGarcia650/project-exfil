// Original artwork — a stylized route connecting waypoints, echoing the
// "find your path" idea without depicting people (side-steps any question
// of authentically/respectfully representing veterans in imagery).
export function PathIllustration() {
  return (
    <svg viewBox="0 0 480 220" className="path-illustration" role="presentation" aria-hidden="true">
      <path
        d="M 30 190 C 120 190, 120 100, 200 100 S 280 40, 360 40 S 420 70, 450 30"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeDasharray="2 10"
        strokeLinecap="round"
      />
      <circle cx="30" cy="190" r="9" fill="var(--accent)" />
      <circle cx="200" cy="100" r="7" fill="var(--text-muted)" opacity="0.5" />
      <circle cx="360" cy="40" r="7" fill="var(--text-muted)" opacity="0.5" />
      <circle cx="450" cy="30" r="11" fill="var(--accent)" />
      <circle cx="450" cy="30" r="18" fill="var(--accent)" opacity="0.15" />
    </svg>
  );
}
