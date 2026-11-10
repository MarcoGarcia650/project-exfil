// Form state helpers for ListingForm (add + edit).

export const today = () => new Date().toISOString().slice(0, 10);
export const EMPTY_LISTING = {
  organizationSlug: "",
  newOrgName: "",
  newOrgWebsite: "",
  name: "",
  format: "TRAINING",
  techTracks: [],
  description: "",
  veteranAccessRoute: "",
  officialSourceUrl: "",
  applicationUrl: "",
  applicationAvailability: "UNKNOWN",
  applicationTiming: "",
  eligibilityNotes: "",
  prerequisites: "",
  remoteAvailability: "",
  locations: "",
  duration: "",
  cost: "",
  skillbridgeNote: "",
  verifiedOn: today(),
  confirmVeteranRoute: false,
};
export const NEW_ORG = "__new__";

// A stored listing (GET /admin/listings/:id) → form state.
export function listingToForm(p) {
  const s = (v) => v ?? "";
  return {
    ...EMPTY_LISTING,
    name: p.name,
    format: p.format,
    techTracks: p.techTracks,
    description: p.description,
    veteranAccessRoute: p.veteranAccessRoute,
    officialSourceUrl: p.officialSourceUrl,
    applicationUrl: s(p.applicationUrl),
    applicationAvailability: p.applicationAvailability,
    applicationTiming: s(p.applicationTiming),
    eligibilityNotes: s(p.eligibilityNotes),
    prerequisites: s(p.prerequisites),
    remoteAvailability: s(p.remoteAvailability),
    locations: p.locations.join("; "),
    duration: s(p.duration),
    cost: s(p.cost),
    skillbridgeNote: s(p.skillbridgeNote),
    verifiedOn: p.verifiedOn.slice(0, 10),
    confirmVeteranRoute: false, // re-confirm on every save
  };
}

// Form state → API body (POST /admin/listings or PUT /admin/listings/:id).
export function formToBody(form) {
  const isNew = form.organizationSlug === NEW_ORG;
  return {
    ...form,
    organizationSlug: isNew ? undefined : form.organizationSlug || undefined,
    newOrganization: isNew ? { name: form.newOrgName, websiteUrl: form.newOrgWebsite } : undefined,
    locations: form.locations.split(";").map((l) => l.trim()).filter(Boolean),
  };
}

