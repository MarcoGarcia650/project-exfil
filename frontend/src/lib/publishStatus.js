// Mirrors backend/src/lib/publishStatus.js: only these are public.
export const isPublicStatus = (status) => status === "PUBLISHED" || status === "ARCHIVED";
