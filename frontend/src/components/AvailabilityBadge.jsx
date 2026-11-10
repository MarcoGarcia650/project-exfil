import { AVAILABILITY_LABELS } from "../lib/programLabels.js";

export function AvailabilityBadge({ value }) {
  return (
    <span className={`badge badge-${value.toLowerCase()}`}>{AVAILABILITY_LABELS[value] ?? value}</span>
  );
}
