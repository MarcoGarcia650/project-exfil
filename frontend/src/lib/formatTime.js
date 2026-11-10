// Comment timestamps: stored UTC, shown in the viewer's own time zone.
export function formatDateTime(value) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
