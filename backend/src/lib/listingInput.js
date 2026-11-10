// Validation for the admin "Add listing" form. Mirrors the research
// validator's trust rules (research/scripts/validate-staging.mjs) for the
// fields stored on Program. Returns { error } or { data, warnings }.

export const TECH_TRACKS = ["SOFTWARE_DEV", "IT_SUPPORT", "CLOUD", "CYBERSECURITY", "DATA"];
export const FORMATS = ["TRAINING", "CERTIFICATION_TRAINING", "FELLOWSHIP", "INTERNSHIP", "APPRENTICESHIP", "DIRECT_HIRE"];
export const AVAILABILITY = ["ACCEPTING", "ROLLING", "CLOSED", "UNKNOWN"];
export const REMOTE = ["remote", "in_person", "hybrid", "varies"];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

function str(value, max, what, { required = false } = {}) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return required ? { error: `${what} is required` } : { value: null };
  if (v.length > max) return { error: `${what} must be at most ${max} characters` };
  return { value: v };
}

function httpsUrl(value, what, { required = false } = {}) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return required ? { error: `${what} is required` } : { value: null };
  try {
    const u = new URL(v);
    if (u.protocol !== "https:") return { error: `${what} must be an https:// link` };
    if (v.length > 500) return { error: `${what} is too long` };
    return { value: u.toString() };
  } catch {
    return { error: `${what} must be a full https:// link` };
  }
}

export function parseListingInput(body = {}, { today = new Date() } = {}) {
  const warnings = [];

  // Organization: an existing slug, or a new one.
  let organization;
  if (typeof body.organizationSlug === "string" && body.organizationSlug) {
    organization = { existingSlug: body.organizationSlug };
  } else {
    const name = str(body.newOrganization?.name, 120, "Organization name", { required: true });
    if (name.error) return { error: name.error };
    const website = httpsUrl(body.newOrganization?.websiteUrl, "Organization website");
    if (website.error) return { error: website.error };
    const slug = body.newOrganization?.slug ? String(body.newOrganization.slug).trim() : slugify(name.value);
    if (!SLUG_RE.test(slug) || slug.length > 60) return { error: "Organization slug must be lowercase letters, numbers and hyphens" };
    organization = { newOrg: { name: name.value, slug, websiteUrl: website.value } };
  }

  const fields = {};
  const take = (key, result) => {
    if (result.error) throw new Error(result.error);
    fields[key] = result.value;
  };

  try {
    take("name", str(body.name, 200, "Program name", { required: true }));
    take("description", str(body.description, 2000, "Description", { required: true }));
    take("veteranAccessRoute", str(body.veteranAccessRoute, 1000, "How veterans can access it", { required: true }));
    take("officialSourceUrl", httpsUrl(body.officialSourceUrl, "Official program page", { required: true }));
    take("applicationUrl", httpsUrl(body.applicationUrl, "Application link"));
    for (const [key, label] of [
      ["eligibilityNotes", "Eligibility"],
      ["prerequisites", "Prerequisites"],
      ["cost", "Cost"],
      ["duration", "Duration"],
      ["applicationTiming", "Application timing"],
      ["skillbridgeNote", "SkillBridge note"],
    ]) {
      take(key, str(body[key], 1000, label));
    }
  } catch (e) {
    return { error: e.message };
  }

  if (!FORMATS.includes(body.format)) return { error: "Choose a format" };
  const techTracks = Array.isArray(body.techTracks) ? [...new Set(body.techTracks)] : [];
  if (!techTracks.length || techTracks.some((t) => !TECH_TRACKS.includes(t))) return { error: "Choose at least one tech track" };
  const applicationAvailability = body.applicationAvailability ?? "UNKNOWN";
  if (!AVAILABILITY.includes(applicationAvailability)) return { error: "Invalid application status" };
  const remoteAvailability = body.remoteAvailability || null;
  if (remoteAvailability && !REMOTE.includes(remoteAvailability)) return { error: "Invalid location type" };

  const locations = Array.isArray(body.locations) ? body.locations.map((l) => String(l).trim()).filter(Boolean) : [];
  if (locations.length > 20 || locations.some((l) => l.length > 100)) return { error: "Up to 20 locations, 100 characters each" };

  const verifiedOn = new Date(body.verifiedOn);
  if (!body.verifiedOn || Number.isNaN(verifiedOn.getTime())) return { error: "Last verified date is required" };
  const endOfToday = new Date(today);
  endOfToday.setUTCHours(23, 59, 59, 999);
  if (verifiedOn > endOfToday) return { error: "Last verified date can't be in the future" };

  // Scope rule: listings must have a post-separation veteran route that the
  // admin read on the official page (the validator's VERIFIED requirement).
  if (body.confirmVeteranRoute !== true) {
    return { error: "Confirm the official page states how veterans who have separated can access it" };
  }

  const slug = body.slug ? String(body.slug).trim() : slugify(fields.name);
  if (!SLUG_RE.test(slug)) return { error: "URL slug must be lowercase letters, numbers and hyphens" };

  if (/guarantee/i.test(fields.description)) warnings.push("The description mentions “guarantee”: make sure it doesn't imply employment.");

  return {
    data: {
      organization,
      slug,
      ...fields,
      format: body.format,
      techTracks,
      applicationAvailability,
      remoteAvailability,
      locations,
      verifiedOn,
    },
    warnings,
  };
}
