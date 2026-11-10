// The Project Exfil mark (icon option B, "Exfil arrow"): an arrow leaving
// a corner. Same drawing as public/favicon.svg; uses currentColor so it
// follows the theme in the navbar.
export function ExfilMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="currentColor" />
      <path d="M17 24 V47 H40" fill="none" stroke="var(--card)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M27 37 L46 18 M31 18 H46 V33"
        fill="none"
        stroke="var(--card)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
