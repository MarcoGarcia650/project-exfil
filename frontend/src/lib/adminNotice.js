// Confirmation messages after an admin action on a listing.
export function adminNotice(outcome, name) {
  switch (outcome) {
    case "archived":
      return `Archived "${name}". It's out of Browse but still readable at its link.`;
    case "unarchived":
      return `Unarchived "${name}". It's back in Browse.`;
    case "unarchivedToDraft":
      return `"${name}" changed since it was last reviewed, so it went to Admin → Drafts to review instead of Browse.`;
    case "removed":
      return `Removed "${name}". Restore it any time from Admin → Removed.`;
    case "deleted":
      return `Deleted "${name}" permanently.`;
    case "savedToDraft":
      return `Saved "${name}". It's in Admin → Drafts to review until you publish it.`;
    default:
      return null;
  }
}
