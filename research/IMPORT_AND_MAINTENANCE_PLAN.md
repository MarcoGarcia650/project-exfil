# Import and maintenance plan

Goal: a small, trustworthy directory that one person can keep current. Nothing reaches production without a human review.

## Pipeline

```
research → staging JSON → validate → import as DRAFT (dry run → local → prod) → review in admin page → Approve & publish
             (git)       (script)    (hidden from users; diff printed)          (you + browser)       (only way to go public)
                                      browser)
```

### 1. Research → staging

- One staging file per batch (`research/programs-staging.json` for batch 1). Commit it so every change has a diff and history.
- Use official provider pages as the source of truth. Search results, news, base flyers and job boards are **leads**. They can go in `evidence` as `third_party`/`search_snippet`, but they can't make a record `SOURCE_VERIFIED`.
- Discovery sources that fit the post-separation scope:
  - the VA GI Bill Comparison Tool (VET TEC 2.0 and GI Bill-approved tech providers);
  - provider "military/veterans" pages;
  - the SkillBridge directory, only to find providers that might *also* run a veteran route. It's unreachable as of 2026-11-08: TLS certificate expired 2026-10-31.
- If a provider page doesn't say something, write `"unknown"`. Don't fill gaps from other programs or from SkillBridge norms.
- Inclusion rule (your decision, 2026-11-08): the program must have a documented route for veterans after separation (`veteranAccess`). Active-duty-only SkillBridge opportunities go in `excluded` with a reason.

### 2. Validate

```bash
node research/scripts/validate-staging.mjs            # read-only; exits 1 on errors
```

The validator checks:

- **Shape:** required fields and enum values.
- **Trust rules:**
  - `SOURCE_VERIFIED` needs `verifiedOn`, official evidence, and a verified veteran route;
  - `APPROVED` needs a `reviewedBy`;
  - active-duty-only records can't sit in `programs`.
- **Duplicates:** same organization + normalized name (error); shared official URL (warning).
- **Staleness:** `verifiedOn` older than 90 days (warning).

Checked on 2026-11-08: it passes on batch 1, and it flagged all four problems deliberately injected into a test copy.

### 3. Human review (the gate) — in the admin page (user decision, 2026-11-08)

Review happens in the admin page's **Drafts to review** list after import, not by editing the staging file. Each draft shows its fields, its official source link and this checklist. The only action is **Approve & publish**; there's no field editing. If something is wrong, fix it in staging, re-validate and re-import (the draft updates in place by slug), then approve.

For each `SOURCE_VERIFIED` record, open `officialSourceUrl` in a real browser (some sites block automated fetches) and confirm:

- [ ] The program is active and the name matches the page.
- [ ] The **veteran route** is stated on the page itself, not inferred.
- [ ] The format is right, and the description doesn't imply employment from training.
- [ ] Cost, duration and application status match, or are marked `unknown`.
- [ ] The application URL works.
- [ ] Each `conflicts` entry is resolved or accepted.

Approving sets `publishStatus = PUBLISHED`, `reviewedById`, `reviewedAt` and `reviewedContentHash` (the content the reviewer actually saw). Expect about 10 minutes per record. Staging `reviewStatus: APPROVED` is no longer needed. The validator's APPROVED rule stays as a safeguard but is unused.

### 4. Import (to build after the schema change)

The importer is the **only** write path for listings in this version: there's no listing-editing UI, and the admin page doesn't edit listings. That's what makes the review gate binding. A required database column, such as the veteran-access route, guarantees only that text exists, not that it was verified (see `SCHEMA_PROPOSAL.md`, "What actually guarantees a listing is verified").

Write `backend/prisma/import-programs.js` yourself, using `seed.js` as the pattern. Its behavior:

- Refuse to run unless the validator passes.
- Import `SOURCE_VERIFIED` records only; `NEEDS_RESEARCH` records are never imported. State transitions follow the table below. The importer never publishes anything; only Approve & publish does.
- Convert `"unknown"` → `null`.
- Map `applicationStatus` to `ApplicationAvailability` (ACCEPTING / ROLLING / CLOSED / UNKNOWN), using the table in `SCHEMA_PROPOSAL.md`.
- Set `verifiedOn` and `contentHash` (a hash of the displayed listing fields, excluding status, review and `verifiedOn` metadata).
- Upsert by `Program.slug` (= staging `id`) and `Organization.slug`, never by display name.
- Default to `--dry-run`, which prints created / updated / unchanged per record. A real run requires `--apply`.
- Never delete. A program removed from staging is reported, and archiving it is a manual decision.

#### Import state transitions (user decision, 2026-11-08: option (a))

| Staging record | Current DB state | Result |
| --- | --- | --- |
| New `SOURCE_VERIFIED` | not in DB | Create as `DRAFT` |
| Content unchanged (same `contentHash`) | any | No state change. A newer `verifiedOn` is updated, so quarterly reverification doesn't unpublish anything. |
| Content changed | `DRAFT` | Update fields; stays `DRAFT` |
| Content changed | `PUBLISHED` | Update fields → **back to `DRAFT`**; clear `reviewedById`/`reviewedAt`/`reviewedContentHash`; re-review in Drafts to review. The public page shows nothing until re-approved. Users who saved it still see it on their dashboard, labelled "Under review". |
| Content changed | `ARCHIVED` | Update fields; **stays `ARCHIVED`**. Import never republishes an archived listing. |
| `archiveReason` set in staging | `DRAFT` or `PUBLISHED` | → `ARCHIVED`, with `archivedAt` and the reason |
| `restore: true` in staging (explicit) | `ARCHIVED` | → `DRAFT` for re-review; clears the archive fields. This is the only way out of ARCHIVED. |
| Downgraded to `NEEDS_RESEARCH` | in DB | No automatic change; flagged in the dry run for an admin decision |

The dry run prints the transition for every record. `--apply` performs exactly what the dry run printed.
- Order of use: local Docker DB first, check the UI, then production as a separate, deliberate step.

### Duplicate detection: where each layer catches what

| Layer | Catches |
| --- | --- |
| Validator | Same org + normalized name; shared official URL |
| Importer | Slug collisions with existing database rows; an approved record matching an archived one |
| Reviewer | The same program listed under two organizations (e.g. AWS re/Start via Per Scholas vs AWS itself), or a renamed program |

## Maintenance

| Cadence | Task | Time |
| --- | --- | --- |
| Monthly | Link check: run the validator, then open every `officialSourceUrl`/`applicationUrl`. A small HEAD-request script can do this later. 404s go to `NEEDS_RESEARCH`. | ~30 min |
| Quarterly (90 days) | Re-verify each published record against its official page, update `verifiedOn`, re-run review. Prioritize records with dated cohorts. | ~2–3 h for 20 records |
| Before known deadlines | Refresh `applicationStatus`/`applicationTiming` (e.g. MSSA windows, Vets Who Code cohort start) | minutes |
| Per batch | Add 10–15 new records. Keep NEEDS_RESEARCH items in the file until resolved or rejected. | ~3–4 h |

Archive rule: archive a program after two consecutive checks with a dead page or no scheduled cohorts (e.g. MSSA-Federal). When archiving:
- write a user-facing `archiveReason`;
- the listing stays readable at its URL and on savers' dashboards;
- its discussion stays open for new comments;
- it's hidden from browse.

Availability vs archive: a program that's merely between cohorts is `CLOSED`, not archived. Amazon's designated job requisitions follow the same rule: when a posting expires, mark it `CLOSED` and point `officialSourceUrl` at an amazon.jobs title search.

## Community submissions feed this pipeline

User-submitted listing updates and new-program leads arrive on the admin page as `Submission` rows. Accepting one only marks it reviewed. The actual change is researched against the official page, recorded in staging, validated, reviewed and imported, the same path as above. A user submission is a lead, never evidence.

## Not doing yet

- No broad scraper.
- **No direct listing editing in the admin page.** The minimal admin page *is* in scope, for reports, submission review and suspension.
- No evidence table in Postgres.
- No SkillBridge filter (de-prioritized by your decision).
- No DMs or notifications (a later version; they ship together).
- No metrics or redesign work in this track.
