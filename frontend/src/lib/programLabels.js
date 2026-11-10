// Display labels for program enums. Keep the key lists in sync with the
// backend's programController.js (unknown values are ignored there too).
export const TECH_TRACK_LABELS = {
  SOFTWARE_DEV: "Software development",
  IT_SUPPORT: "IT & support",
  CLOUD: "Cloud",
  CYBERSECURITY: "Cybersecurity",
  DATA: "Data",
};

export const FORMAT_LABELS = {
  TRAINING: "Training",
  CERTIFICATION_TRAINING: "Certification training",
  FELLOWSHIP: "Fellowship",
  INTERNSHIP: "Internship",
  APPRENTICESHIP: "Apprenticeship",
  DIRECT_HIRE: "Direct hire",
};

export const AVAILABILITY_LABELS = {
  ACCEPTING: "Accepting applications",
  ROLLING: "Rolling applications",
  CLOSED: "Applications closed",
  UNKNOWN: "Application status unknown",
};

export const REMOTE_LABELS = {
  remote: "Remote",
  in_person: "In person",
  hybrid: "Hybrid",
  varies: "Varies",
};

// verifiedOn is a date-only value stored as UTC midnight; format in UTC so
// it doesn't shift a day in US time zones.
export function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
