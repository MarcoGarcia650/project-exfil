// Colors here are commonly-published brand colors (not logo artwork) for
// the known seed employers. Colors themselves aren't protectable the way
// a logo mark is, so this sidesteps the trademark-reproduction question
// entirely while still giving each card visual identity.
const BRAND_COLORS = {
  Amazon: "#FF9900",
  Oracle: "#C74634",
  Microsoft: "#0078D4",
  "Hiring Our Heroes": "#1B3A6B",
  VetsinTech: "#0F766E",
};

const FALLBACK_PALETTE = ["#6d28d9", "#0F766E", "#B45309", "#1D4ED8", "#BE185D"];

// Any employer not in BRAND_COLORS (e.g. added later via v2 scraping)
// still gets a stable, distinct color — hashed from the name so the
// same employer always lands on the same color across renders.
function colorForName(name) {
  if (BRAND_COLORS[name]) return BRAND_COLORS[name];
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

export function EmployerBadge({ name, size }) {
  return (
    <div className={size === "lg" ? "employer-badge lg" : "employer-badge"} style={{ backgroundColor: colorForName(name) }} aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
