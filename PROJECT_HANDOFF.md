# Project Exfil — shared handoff

This file connects work done in Claude's VS Code extension and Codex. Read it before planning or changing the project. Keep it concise and current; use git history for older detail. Repository code and actual verification results take precedence over summaries here.

## Current direction

- Focus the directory on **tech career programs accessible to veterans after separation**: software development, IT/support, cloud, cybersecurity, and data. Judge relevance by the career pathway, not the employer's industry.
- **Exclude active-duty-only SkillBridge opportunities.** Programs that also offer SkillBridge may stay only if they have a verified veteran-accessible route, documented per record (`veteranAccess.route`).
- Do not prioritize SkillBridge-specific filters or schema work.
- Priorities: expand trustworthy program data, add useful product metrics, improve design, then invite a small private test group before broader promotion.
- Prefer a manageable, reviewed process for a solo developer over broad scraping.

## Active work

Research batch 1 (Claude, 2026-11-08) is drafted and awaiting **human review**. Nothing has been imported, migrated or deployed.

- Staging data: [research/programs-staging.json](research/programs-staging.json) contains organizations, programs, a recheck of existing seeds, related resources, and exclusions.
- Validator: [research/scripts/validate-staging.mjs](research/scripts/validate-staging.mjs). Read-only; run `node research/scripts/validate-staging.mjs`.
- Schema proposal: [research/SCHEMA_PROPOSAL.md](research/SCHEMA_PROPOSAL.md) separates organizations from programs and gives an expand/backfill/switch/contract migration that preserves saved data.
- Process: [research/IMPORT_AND_MAINTENANCE_PLAN.md](research/IMPORT_AND_MAINTENANCE_PLAN.md) covers validation, the review gate, the import design, dedupe and reverification cadence.

## Decisions and proposals

| Status | Item | Source / reason |
| --- | --- | --- |
| Agreed (user) | Narrow to tech careers | Clearer scope, easier maintenance. |
| Agreed (user) | Verify with official sources; review before publication | Trustworthy curation is the core value. |
| Agreed (user, 2026-11-08) | Post-separation veteran access is required; active-duty-only SkillBridge is excluded; SkillBridge is secondary | User scope change mid-research. |
| Agreed (user, 2026-11-08) | Each specific program or designated role is its own listing under its employer/organization, saved and tracked separately. Applies to all employers (e.g. Amazon: Technical Apprenticeships, SDE – Military Veterans, SDE Apprentice – Military Veterans, SDE Intern – Military Veteran). Per Scholas to be split per course. | User answer to open questions. |
| Agreed (user, 2026-11-08) | Archived listings stay visible to users who saved them, marked archived with a reason. Applies to all archived listings. Amazon careers-hub saves migrate to Amazon Technical Apprenticeships. HOH CFP is archived. | User answer to open questions. |
| Agreed (user, 2026-11-08) | This version's scope, as listed in "This version's scope" below. DMs and notifications are deferred to a later version and ship together. No further scope expansion. | User, after review with Codex. |
| Agreed (user, 2026-11-08) | Content change to a PUBLISHED listing → back to DRAFT for re-review (option (a), Codex's recommendation); unchanged re-imports preserve state; import never republishes an archive. Full transition table in the plan doc. | Codex follow-up review finding 1–2. |
| Agreed (user, 2026-11-08) | Codex follow-up findings 3–5: admin lookup by username **or** (private) email; reset links only via a verified account-owner channel; DRAFTs excluded from every public endpoint; precise proxy trust (not blanket). | Applied to the schema doc. |
| Agreed (user, 2026-11-08) | **Schema proposal approved** ("I trust the schema is good to go"). | Phase 1 can start. |
| Agreed (user, 2026-11-08) | **Working mode:** Claude implements agentically, including core logic, migrations and the importer; the user owns major decisions. Supersedes the earlier "Marco writes the importer/core logic" plan. | The user no longer wants to write core logic. |
| Agreed (user, 2026-11-08) | Commit the planning files (handoff, agent instructions, `research/`) on a feature branch before code changes. | User approval. |
| Superseded | "Represent SkillBridge separately from program format" as a schema priority | Replaced by the decision above. The proposal keeps only an optional `skillbridgeNote` text field. |
| Proposed (Claude) | Separate `Organization` from `Program`; `Program.slug` as the import key; `PublishStatus` with ARCHIVED, never delete | The current `Employer.name @unique` allows one program per org. The batch has orgs with 2–3 programs. |
| Proposed (Claude) | Replace `ProgramType` with `ProgramFormat` (TRAINING, CERTIFICATION_TRAINING, FELLOWSHIP, INTERNSHIP, APPRENTICESHIP, DIRECT_HIRE) | The current enum has no training value; MSSA is mis-seeded as FELLOWSHIP. |
| Proposed (Claude) | Required `veteranAccessRoute` column; null = unknown; evidence stays in git, not Postgres | Enforces the inclusion rule while keeping the schema small. |
| Agreed (user, 2026-11-08) | (Claude writes the importer, per the working mode.) Importer loads SOURCE_VERIFIED records as DRAFT (also in production); review and publish happen in the admin page via Approve & publish (status-only). Dry run by default, upserts by slug, never deletes. Supersedes "imports only APPROVED". | See the plan doc. Marco to write it, per the teaching approach. |
| Agreed (user, 2026-11-09) | Additive migration `20261110003637_program_awaiting_research`: `Program.awaitingResearch` (default false), backfilled true for the legacy `oracle-ovip` DRAFT. Admin Approve & publish refuses flagged rows; the importer clears the flag whenever it writes SOURCE_VERIFIED content. | Found in phase 5: the legacy Oracle draft (NEEDS_RESEARCH) was indistinguishable from verified drafts, so it could have been published by mistake. Applied to local Docker only. |
| Agreed (user, 2026-11-09) | **Reject in Drafts to review** = new hidden `REJECTED` status (not ARCHIVED, which would make unreviewed content public at its URL). The admin-only reason is stored in `rejectionReason`. A "Rejected" admin tab offers "Return to drafts". The importer keeps REJECTED when content is unchanged and returns it to DRAFT when content changes. It never archives or publishes a rejected row. | User request after reviewing drafts in production; the user chose the hidden state over archive. Migration `20261110014820_program_rejected_status` (additive). |
| Agreed (user, 2026-11-09) | **v2 wrap-up list** (user): browse search; contact admin (navbar, non-admins); admin "Add listing"; unsave; custom favicon; light mode default + navbar dark/light switch (keep current dark colors), modelled on Indeed/Handshake **patterns** (not their branding); home page reachable when logged in; About page; FAQ page. Order: (1) quick wins, (2) design foundation, (3) About/FAQ/contact, (4) add listing. | User message 2026-11-09; supersedes "redesign deferred" for this version. |
| Agreed (user, 2026-11-09) | **Contact admin = form + admin inbox:** logged-in users send a message from a navbar "Contact" link; the admin page gets a Messages tab; the admin replies with a note the user sees on "My messages" (like submissions). No DMs/email needed; one additive migration. | User chose the recommended option. |
| Agreed (user, 2026-11-09) | **Admin "Add listing" creates a DRAFT** (same required fields as the validator) that goes through Drafts to review → checklist → Approve & publish. Imports never overwrite it. No listing editing in this version. | User chose the recommended option. |
| Agreed (user, 2026-11-09) | **Design: mockups first.** Claude makes 2–3 visual directions (light default + dark) for the user to pick before implementing. | User chose the recommended option. |
| Agreed (user, 2026-11-09) | **Design = Direction D**: B's filter sidebar + card grid (save toggle per card) + search in the navbar; clicking a card opens an A-style detail card as a **modal** over the grid (page dims/blurs; ✕, background click, Escape; "Open full page"). Light theme default with a navbar dark/light switch (dark = the current colors). Canvas: https://claude.ai/artifact/A6wxmK1z1FmNCtQQSkfEkm | User: "lets do D, i love it". |
| Agreed (user, 2026-11-10); supersedes "no direct listing editing" | **Admins can edit listings in the app** (Edit listing on the public page, drafts, rejected listings, listing-update suggestions). PUBLISHED stays live and the edit counts as the review; DRAFT stays draft; ARCHIVED stays archived; REJECTED → DRAFT. URL slug + organization fixed; name editable. `editedInAppAt` is set, and the **importer skips app-edited slugs** whose staging content differs (`SKIP_EDITED_IN_APP`) unless `--overwrite-app-edits`. | User: admins must be able to fix listings (e.g. add Cloud to Amazon SDE Apprentice) without staging/import. |
| Agreed (user, 2026-11-10) | **Individual job openings may be listed when the posting explicitly values military experience** (not only veteran-designated programs/roles), if the career pathway is tech-relevant. First case: AWS Engineering Maintenance Technician (data-center facilities). **AWS data-center roles are tagged Cloud for now (temporary; revisit, see open questions item 6)**; no separate data-center track yet. Solutions Architect is Cloud as well. Openings expire: set CLOSED or archive with a reason when they close. | User: "its technical enough… for aws data centers… quals… prefer mil experience". |

## Latest implementation state

- **Repo location changed (2026-11-09): `~/projects/VetTool`.** It moved out of iCloud-synced `~/Documents`, where offloaded `node_modules`/`.git` files made Node and Prisma hang. The copy was verified byte-identical (checksum rsync, 359 files) with `git fsck` clean, and dependencies were reinstalled. **The old copy at `~/Documents/InterviewPrep/MainProjects/VetTool` has been deleted by the user (confirmed absent 2026-11-09).** If Node/Prisma hangs again, check `find . -flags +dataless` first.
- **Reject drafts (2026-11-09), LOCAL, built after the first production deploy:**
  - migration `20261110014820_program_rejected_status` (enum value + 2 nullable columns);
  - public visibility is now an allow-list ([publishStatus.js](backend/src/lib/publishStatus.js): PUBLISHED, ARCHIVED) in every public controller, replacing `=== "DRAFT"` deny-checks;
  - `POST /admin/drafts/:id/reject` (reason + contentHash; works on awaiting-research drafts), `GET /admin/rejected`, `POST /admin/rejected/:id/restore`;
  - UI: "Reject…" on every draft (not gated by the checklist), a [RejectedTab.jsx](frontend/src/pages/admin/RejectedTab.jsx), and the dashboard says "isn't available right now" for a rejected saved listing.
  - Checks: unit 28/28 (3 new importer tests), reject HTTP 24/24 (hidden on every public endpoint, reason never public, importer keeps it, restore, dashboard minimal), browser 7/7; all earlier suites green after clearing piled-up local test comments (over 20 top-level comments pushed new ones to page 2, which the app handles correctly).
  - **In production (2026-11-09):** Claude deployed it at the user's request: migration applied; EB version `reject-a38aebe`; frontend synced to S3 plus invalidation. Live check 12/12.
- **PRODUCTION (2026-11-09), phase 6 in progress. Hybrid deploy: the user did the console steps; the user ran the DB-writing commands (Claude Code's auto-mode blocks production writes from Claude), and Claude ran the dry runs and read-only checks.**
  1. RDS manual snapshot `vetpath-db-before-phase6` (user, console). Confirmed `available`.
  2. `prisma migrate deploy` applied `20261108230000_programs_directory_expand` and `20261110003637_program_awaiting_research` (user ran it). `migrate status`: up to date.
  3. `import-programs.js --apply`: 13 CREATE_DRAFT (user ran it). Re-run dry run: 13 UNCHANGED.
  4. `migrate-legacy-employers.js --apply` (user ran it): Amazon → amazon-technical-apprenticeship, Microsoft → microsoft-mssa, Oracle → oracle-ovip (DRAFT, `awaitingResearch`), HOH and VetsinTech → ARCHIVED. 1 real save moved; 0 unmapped.
  5. EB: env property `FRONTEND_URL=https://projectexfilout.org` added; version `phase6-275c0d7` (zip from `backend/scripts/make-deploy-zip.sh`) deployed via console. Green. The previous version `app-260810_165616107221` remains for rollback.
  6. Emails: 2 users, 0 mixed-case, so `normalize-emails.js` was not needed.
  7. Frontend `dist/` uploaded to S3 `vetpath-frontend-600406561374` (old 2026-08 `assets/index-KkncmAd2.js`/`index-Ci9BJLK4.css` left in place, harmless); CloudFront `E13O5U324HB46D` invalidation `/*` completed.
  - Read-only checks afterwards: API (`/programs` returns `[]`, draft 404, archived 200, `/employers` 404, validation) and live-site browser 10/10.
  - After the user's admin review: 5 PUBLISHED (amazon-sde-apprentice-military-veterans, amazon-sde-military-veterans, codeplatoon-fullstack, ivmf-o2o, microsoft-mssa), 9 DRAFT (including Oracle), 2 ARCHIVED. The user's account is ADMIN, granted by the user running make-admin. **Remaining:** deploy the reject feature (migration → backend zip → frontend), verify Oracle (the user pastes the official page text; Claude updates staging; the user runs the import), make the user's account admin, review and publish drafts in `/admin`, a logged-in smoke test, `TRUST_PROXY` after a header check, invite testers, and later the contract migration.
- **Phase 5 complete, LOCAL ONLY (2026-11-09, same branch). Admin page:**
  - one schema change, the `awaitingResearch` migration (see Decisions), applied to local Docker only;
  - `requireAdmin` (role read from the DB each request); [make-admin.js](backend/prisma/make-admin.js) (`npm run make-admin -- <email-or-username> [--revoke]`) is the only way to grant admin; granting also lifts any suspension;
  - [adminController.js](backend/src/controllers/adminController.js) under `/admin` (all routes require an admin):
    - summary counts;
    - reports grouped by comment → hide with an admin-only reason (resolves reports ACTIONED) or dismiss (DISMISSED);
    - submissions by status → accept/reject once with a note shown to the submitter (status only; never edits a listing);
    - user search by username prefix or email (admin-only) → suspend/unsuspend (admins can't be suspended) and reset link (records the issuing admin);
    - drafts with full content and `contentHash` → Approve & publish needs the same hash (409 if content changed since loading), refuses `awaitingResearch` rows and non-drafts, and records reviewer, time and reviewed hash.
  - Frontend: [pages/admin/](frontend/src/pages/admin/) at `/admin?tab=` (Reports, Submissions, Users, Drafts to review). The Admin nav link shows only for admins; others are redirected. Drafts show every field, the official link and the plan's 6-item checklist; Approve stays disabled until all are ticked. The Oracle draft shows "Awaiting research" with no button.
  - Fixes found by phase-5 screenshots: the navbar wraps on phones (logged-in links overflowed); long URLs wrap in detail lists.
- **Verified locally (Phase 5, 2026-11-09):**
  - `npm test` 25/25 (2 new importer tests for the flag);
  - admin HTTP 50/50: 401/403, make-admin grant/idempotent/unknown/revoke taking effect immediately, report grouping, hide/dismiss and statuses, submission review and the submitter seeing the note, user search, suspend effects, admin not suspendable, admin-issued reset link works, drafts: Oracle refused, stale hash 409, publish → public → importer still UNCHANGED;
  - browser 17/17;
  - all earlier suites rerun: 39/39, 58/58 (one brittle total-count check fixed to compare with the DB), 24/24, 14/14, 17/17;
  - admin page at 390px has no horizontal scroll; build and lint clean.
  - Test publishes were reverted to DRAFT by SQL, and test admins revoked: local DB has 0 admins and 1 PUBLISHED listing.
- **Phase 4 complete, LOCAL ONLY (2026-11-09, same branch). Community (no schema change; tables came with the expand migration):**
  - [commentController.js](backend/src/controllers/commentController.js):
    - `GET /programs/:slug/comments?cursor=` (public): top-level oldest-first, 20 per page, keyset cursor on `(createdAt, id)`, each with 3 reply levels (20 per level, plus `replyCount`);
    - `GET /comments/:id/thread?cursor=` (public): a view rooted at one comment with its replies paged;
    - `POST /programs/:slug/comments` (auth, active, username required → 403 `USERNAME_REQUIRED`; 1–2,000 chars; parent must exist, be on the same program and not be hidden; 5 per 10 min, counted in the DB);
    - `POST /comments/:id/reports` (1–500 chars; not your own; not hidden; one per user per comment; 30/day);
    - DRAFT listings 404 for all of these; ARCHIVED listings stay open. Hidden comments come back as a placeholder with no body or author, their replies stay visible, and `hiddenReason` is never sent.
  - [submissionController.js](backend/src/controllers/submissionController.js): `POST /submissions` (LISTING_UPDATE needs a public listing; NEW_LISTING_LEAD must not have one; body 1–5,000; optional http(s) source URL; 10/day; no username needed) and `GET /submissions/mine`. Submissions never touch listings.
  - Limits and validators: [communityRules.js](backend/src/lib/communityRules.js); DB-counted limits: [postingLimit.js](backend/src/lib/postingLimit.js).
  - Frontend:
    - [CommentsSection.jsx](frontend/src/components/CommentsSection.jsx) on every program page: plain-text bodies with `pre-wrap`, local-time timestamps, Reply/Report inline, indent capped at 3 with "Continue thread", "Load more comments";
    - gates for logged-out, no-username (returns to the listing after choosing) and suspended users;
    - [ThreadPage.jsx](frontend/src/pages/ThreadPage.jsx) at `/comments/:id`;
    - the real [SuggestPage.jsx](frontend/src/pages/SuggestPage.jsx) (`/suggest`, `/suggest?program=slug` via "Suggest an update" on listings) replaces the placeholder;
    - [MySubmissionsPage.jsx](frontend/src/pages/MySubmissionsPage.jsx) at `/account/submissions` (status and admin note), linked from the dashboard.
- **Verified locally (Phase 4, 2026-11-09):**
  - `npm test` 23/23 (5 new);
  - HTTP smoke 58/58: read 404s, every posting rule, depth 3 + thread view, rate limits 429, hidden placeholder and reason not leaked, report rules, pagination of 22 SQL-inserted comments with no overlap, submission rules, own-only list, listing untouched;
  - browser 17/17: logged-out read, removed placeholder, continue thread, post, HTML shown as text, reply nesting, report, suggest update → my submissions, new lead, load more, username gate → return;
  - regressions: smoke 39/39, browser 24/24 and 14/14;
  - phone and dark screenshots; build and lint clean.
  - Not checked: screen readers, very long threads for performance.
- **Phase 3 complete, LOCAL ONLY (2026-11-09, same branch). Account hardening (no schema change; the expand migration already had the fields):**
  - [accountRules.js](backend/src/lib/accountRules.js): username rules from the schema doc (3–20 `[A-Za-z0-9_]`, starts with a letter, reserved list, case-insensitive via `usernameKey`), password 8 chars to 72 bytes (bcrypt limit), loose email check, signup body parsing (branch enum, targetField ≤100, optional date). Bad input now returns 400 instead of a 500;
  - emails stored lowercase; login and duplicate checks match case-insensitively so older mixed-case rows still work. [normalize-emails.js](backend/prisma/normalize-emails.js) (dry run default; refuses if two accounts differ only by case) lowercases existing rows. Local dry run: 9 users, 0 need changes;
  - [requireAuth.js](backend/src/middleware/requireAuth.js) loads the user row per request: `tokenVersion` mismatch → 401 (JWTs now carry `tv`; old tokens without it count as 0). `requireActiveAccount` makes suspended accounts read-only (403 on POST/PATCH). `requireAdmin` is left for phase 5;
  - [rateLimits.js](backend/src/middleware/rateLimits.js) (`express-rate-limit`, in-memory): login 30/15 min per IP, plus 10 failed/15 min per email; signup 20/h per IP; reset 10/15 min per IP. `trust proxy` is set only from `TRUST_PROXY` (a hop count), never `true`;
  - endpoints: `GET /auth/me`, `POST /auth/username` (only while unset), `POST /auth/reset-password` (hashed, single-use, 24h token; bumps `tokenVersion`; race-safe conditional update);
  - [passwordReset.js](backend/src/lib/passwordReset.js) keeps token creation separate from delivery. Until the phase 5 admin button: `npm run reset-link -- <email-or-username>` in `backend/` prints the link (uses `FRONTEND_URL`). A new link voids older unused ones;
  - frontend: username at signup (with hints), `/account/username` plus a dashboard prompt for accounts without one, `/reset-password` page, a login notice after reset, a "contact the admin" note for forgotten passwords, and auto-logout when the API returns 401 for a session.
- **Verified locally (Phase 3, 2026-11-09):** `npm test` 18/18 (8 new rule tests); HTTP smoke 39/39 (validation 400s, case-insensitive email/username 409s, login case, /me, username set-once, pre-`tv` JWT accepted, suspension 403/200, reset: voided/short/bogus/used/expired links rejected, old session 401, old password 401, new one works, rate-limit 429 after 10 failures with other accounts unaffected); browser 14/14 (signup, reset in a second tab logs out the stale tab, used link, legacy username prompt → taken error → set → prompt gone); Phase 2 browser rerun 24/24; build and lint clean. Not checked: rate limiting behind the real CloudFront/nginx chain.
- **Phase 2 complete, LOCAL ONLY (2026-11-09, same branch). Public directory:**
  - backend: `GET /organizations/:slug` ([organizationController.js](backend/src/controllers/organizationController.js)): PUBLISHED programs plus ARCHIVED ones listed separately; DRAFTs never appear; an org with nothing public returns 404. `GET /saved-employers/program-ids` (auth) returns the user's saved program ids for Save-button state;
  - frontend: public `/programs` browse (no login) with techTrack/format/availability filters in the URL; unknown values ignored; empty state with Clear filters and a "Suggest a program" link;
  - [ProgramDetailPage.jsx](frontend/src/pages/ProgramDetailPage.jsx) at `/programs/:slug`: availability badge, last verified, veteran access route, "Not stated by provider" for nulls, archived banner with reason, Apply/official links;
  - [OrganizationPage.jsx](frontend/src/pages/OrganizationPage.jsx) at `/organizations/:slug`; not-found page for drafts, missing slugs and unknown routes;
  - `/employers` redirects to `/programs` keeping its query. Logged-out "Log in to save" returns to the same page after login/signup. A 409 "already saved" is treated as saved;
  - `/suggest` is a **placeholder** page until submissions ship in phase 4;
  - dashboard: program names link to their pages (not DRAFTs); the doubled "Archived. Archived Nov 2026…" label is fixed (reason shown alone); notice colours now themed for dark mode;
  - home: primary CTA is "Browse programs" (public); step copy updated to the actual filters.
- **Verified locally (Phase 2, 2026-11-09):** backend smoke 14/14 (org 200/404 cases, no review-metadata or org-id leak, program-ids auth and contents, dashboard 200, filter); `npm test` 10/10; headless Chrome end-to-end 24/24 (logged-out browse, URL filters, empty state, clear, legacy redirect, detail, archived, draft 404, org pages, login-to-save return, saved state, dashboard link, only expected 404s, no console errors); screenshots at 390px (no horizontal scroll) and in dark mode; `vite build` OK; `oxlint` only the pre-existing AuthContext warning. Not checked: real mobile devices, screen readers.
- **Phase 1 complete, LOCAL ONLY (branch `feature/programs-directory`):**
  - expand migration `20261108230000_programs_directory_expand` (additive), applied to local Docker only;
  - [import-programs.js](backend/prisma/import-programs.js): validator-gated, dry run by default, transition table, 10 passing `node:test` cases (`npm test`);
  - [migrate-legacy-employers.js](backend/prisma/migrate-legacy-employers.js): the backfill;
  - backend `/programs` (PUBLISHED-only browse with techTrack/format/availability filters; DRAFT → 404; ARCHIVED viewable with reason); `/employers` removed; program-based saves and dashboard (DRAFT shows name/org/"Under review" only; ARCHIVED shows reason); format-based action-item templates;
  - minimal frontend switch: browse and dashboard use programs (route rename and public browse done in phase 2).
- **Verified locally (2026-11-09):**
  - 26/26 HTTP smoke checks: public reads, no review-metadata leak, filters, draft 404s, archived detail, save rules (401/404/409/400), and legacy dashboard intact;
  - headless-browser end-to-end 8/8: signup → browse → filter → save → dashboard; legacy user sees 2 archived reasons and 3 "Under review"; no console errors;
  - `vite build` succeeds.
- **Local-only test data:** users `legacy-test@example.com` (5 migrated saves; local password set for testing) plus a few `smoke-*`/`e2e-*@example.com` signups. `vetswhocode-accelerator` was set PUBLISHED via SQL as a stand-in for the unbuilt admin Approve & publish.
- **Not done:** the contract step (drop `Employer`, require `programId`), which comes after production is verified. Production is untouched.
- **Batch 1:** 25 in-scope programs: 13 `SOURCE_VERIFIED` and 12 `NEEDS_RESEARCH`, 0 `APPROVED`. 10 records excluded, 6 of them as active-duty-only. Archive reasons for seed rows are drafted in `existingSeedRecheck`.
  - Source-verified: Microsoft MSSA, Amazon Technical Apprenticeships, Amazon SDE – Military Veterans, Amazon SDE Apprentice – Military Veterans (both from amazon.jobs search results), Salesforce Military, Per Scholas military learners, NPower Path2Tech Cloud, NPower Path2Tech Cybersecurity, NPower Networking & Sysadmin, Code Platoon AI + Fullstack, Fortinet Veterans Program, IVMF Onward to Opportunity, Vets Who Code.
  - Needs research: Amazon SDE Intern – Military Veteran (seasonal; no live posting on 2026-11-08), Oracle OVIP, MSSA Cleared Talent Accelerator, HOH Data Centers Pathway, HOH Salesforce Fellowship, Code Platoon Cloud/DevOps, VetsinTech VIT Academy, ServiceNow RiseUp, SkillStorm, LaunchCode, SANS VetSuccess, BreakLine.
  - Excluded as active-duty-only: NPower SkillBridge Cyber, HOH Corporate Fellowship, Amazon SkillBridge fellowships, CrowdStrike SkillBridge, Akamai military apprenticeship, Palo Alto SkillBridge.
- **Seed recheck findings:**
  - Amazon row is a careers hub, not a program.
  - MSSA is typed FELLOWSHIP but is training.
  - HOH CFP is now active-duty-only and not tech; the seed wrongly lists spouses.
  - VetsinTech row is an organization, not a program.
  - Oracle's official page blocks automated fetch. The brief's "6-month" contradicts the official "quarter-long" wording.
- **Verification actually performed (2026-11-08):**
  - WebFetch of official provider pages listed in each record's `evidence`.
  - Validator passes on batch 1, and catches injected errors (duplicate, unreviewed APPROVED, active-duty-only, empty field) on a test copy.
  - Not verified: any page that returned 403/404 (noted per record). Nothing has been checked in a real browser.
- **Limitation:** skillbridge.osd.mil's TLS certificate expired 2026-10-31. It was not fetched; bypassing certificate checks was declined. No record claims SkillBridge directory confirmation.

## This version's scope (user, 2026-11-08, after review with Codex)

**In scope:**
- **Directory:** organizations → programs, each its own listing.
- **Archived listings:** shown with a reason and still open for comments.
- **Last verified:** each listing shows its last-verified date.
- **Shareable program pages,** one per program.
- **Application availability** (accepting / rolling / closed / unknown), kept separate from publish/archive status.
- **Helpful empty search results:** filters preserved, a "clear filters" option, and a link to suggest a program.
- **Submissions:** listing updates and new-program leads, reviewed by the admin and never auto-applied.
- **Threaded public discussion,** with per-comment timestamps, pagination, length limits and basic posting rate limits.
- **Usernames** as the only public identifier.
- **Reactive moderation:** report, hide and suspend.
- **Minimal admin page:** reports, submissions and user suspension. No listing editing.
- **Password reset** before inviting testers, via **admin-generated one-time reset links** (user, 2026-11-08). Reset emails via SES are on hold while the user scopes costs, and move to the later version with DMs and notifications. Password reset does not exist today (see findings).

**Not in this version:**
- DMs and notifications (a later version; they ship together);
- direct listing editing;
- username changes;
- comment edit windows, new-account limits and auto-hide;
- SkillBridge filters;
- metrics and redesign (separate tracks).

**Design preference (user, 2026-11-08):** the user prefers Indeed's UI/design to the current Exfil site. Recorded for the separate redesign track, not this version. Use it as inspiration for familiar job-board patterns (e.g. a prominent search bar with filters, a scannable result list, and a list/detail view where the selected listing opens alongside the results). Don't copy Indeed's branding, logo, colours or distinctive visual identity.

**Avoid further scope expansion** (user instruction).

Details and models: [research/SCHEMA_PROPOSAL.md](research/SCHEMA_PROPOSAL.md) (reconciled 2026-11-08; the handoff wins if they ever disagree).

### Community decisions (user, 2026-11-08)

- User submissions never change a listing directly; only admin-verified changes go through staging → review → import.
- Public read access; an account is required to save, comment, report or submit.
- Every comment shows when it was posted. There's no "last discussed" label and no relevance judgement; users infer recency. "Like Reddit, but for a curated database of verified tech opportunities for veterans."
- Comments are not pre-moderated. The admin acts on harmful behaviour (e.g. slurs) via report → hide / suspend.
- Threaded comments, using a proper `parent`/`replies` self-relation, with server-side validation that a reply belongs to the same program.
- Usernames: the user asked for simple rules. Proposed in the schema doc:
  - unique and case-insensitive (via a lowercase `usernameKey`);
  - 3–20 characters `[A-Za-z0-9_]`, starting with a letter;
  - reserved administrative names;
  - new users pick one at signup; existing users must pick one before commenting;
  - changes deferred.
- DMs, when built later: report a conversation (with admin access to reported conversations, disclosed to users), blocking, a DM opt-out, and limits on new accounts. Notifications ship with them, starting in-app only.

## Findings from inspecting the existing app (Claude, 2026-11-08)

- **No password reset.** Auth is `POST /auth/signup` and `POST /auth/login` only ([authController.js](backend/src/controllers/authController.js)). No email library or SES config exists.
- **Session handling:** JWTs last 7 days, contain only `userId`, are stored in `localStorage`, and can't be revoked.
- **No rate limiting anywhere,** including login.
- **No server-side signup validation:** a bad `branch` causes an unhandled Prisma error, and there's no password minimum.
- **Emails are case-sensitive** at signup and login, so duplicate accounts are possible.
- **Browse is behind login on the frontend** ([App.jsx](frontend/src/App.jsx) wraps `/employers` in `ProtectedRoute`), although `GET /employers` itself is public. This must change for public read access.
- **There's no individual listing page or route.** The CloudFront SPA fallback (403/404 → index.html) means deep links like `/programs/:slug` will load. Link previews on LinkedIn and similar sites will be generic, because it's a client-rendered SPA.
- **Filters live in component state** ([EmployersPage.jsx](frontend/src/pages/EmployersPage.jsx)), so they're lost on refresh and can't be shared.
- **Backend runs behind CloudFront** on single-instance Elastic Beanstalk. IP-based rate limiting needs `trust proxy`; an in-memory limiter store is fine with one instance.
- **Suspension and roles must be checked from the DB on each request,** not baked into the 7-day JWT.

## Phased implementation plan (approved by user 2026-11-08; phases 1–2 done locally)

Each phase ends working on the local Docker DB. Production happens only in phase 6.

| Phase | Work | Done when |
| --- | --- | --- |
| **0. Decide (no code)** | Approve the schema proposal (on hold). | Schema approved. |
| **1. Data model + importer** | Expand migration; align staging/validator with the 4 availability values; Marco writes the importer (dry run by default); backfill legacy rows (Amazon hub saves → Technical Apprenticeship; HOH CFP and VetsinTech archived with reasons); switch controllers to `Program`; new action-item templates. | Local DB holds SOURCE_VERIFIED programs as DRAFT; old saves are intact and point at programs. |
| **2. Public directory** | Public browse; organization pages listing their programs; shareable `/programs/:slug` pages (verified date, availability badge, archived banner + reason, veteran route); filters in the URL; empty state with a clear-filters button and a suggest-a-program link. | A logged-out visitor can browse, filter, open and share a listing. |
| **3. Account hardening (before testers)** | Usernames: chosen at signup, plus a prompt for existing users; signup validation; lowercase email (check existing rows first); password minimum; login rate limit plus `trust proxy`; `tokenVersion` and a DB-backed `requireAuth`; password reset tokens (hashed, single-use, expiring) plus a reset page, with delivery kept separate so SES can be added later without changes. | Testers can sign up, pick a username, and recover a forgotten password. |
| **4. Community** | Threaded comments with same-program validation, pagination, length limits and posting rate limits, rendered as plain text; reports; submissions (update a listing, suggest a program). | Logged-in users can discuss, report and submit; logged-out users can read. |
| **5. Admin page** | `role` plus `requireAdmin`; first admin set via a one-off script; report queue (hide / suspend / dismiss), submission review (accept / reject with note), user suspend/unsuspend, **generate password-reset link**, and **Drafts to review** (Approve & publish only; no field editing). **Review the 13+ drafts here** (user decision). | You can moderate, triage submissions and publish reviewed listings without SQL. |
| **6. Production + testers** | RDS snapshot → migrations → import SOURCE_VERIFIED records as DRAFT → deploy backend and frontend → review & publish drafts in the admin page → smoke test → contract migration later → invite testers. | Live, with a small tester group invited. |

## Open questions / decisions needed

Decided by the user, 2026-11-08 (recorded in the schema doc):
- reset via admin-generated links now, with SES email deferred to the DM/notifications version;
- a 3-level visual indentation cap, then "continue thread";
- hidden comments shown as a "Removed by admin" placeholder, with their replies still visible (Reddit-style);
- generic link previews accepted;
- the proposed limits approved.

Also decided (user accepted Claude's defaults, 2026-11-08):
- top-level comments are sorted **oldest-first**;
- **new replies to a hidden comment are blocked**, while existing replies stay visible;
- **testers request a password reset by contacting the user directly**, with no public request form or endpoint.

Data answers (user, 2026-11-08), applied to `programs-staging.json`; validator passes:
- Salesforce Admin counts as IT_SUPPORT.
- Amazon Technical Apprenticeship lists all tracks, including Technical Sales and TAM.
- Oracle OVIP: the user says separated veterans can apply. This is recorded as **user-provided**; the record stays NEEDS_RESEARCH / veteranAccess UNVERIFIED until the official oracle.com page is read in a browser.

Remaining:

0. ~~iCloud offloading~~: **resolved.** The repo moved to `~/projects/VetTool` and the user deleted the old copy (confirmed absent 2026-11-09).

1. ~~Schema approval~~: **approved (user, 2026-11-08).** Phase 1 starting on the local Docker DB only. Production steps (phase 6) still need explicit user go-ahead.
2. ~~When and where to review listings~~: **decided (user, 2026-11-08)**. Records are reviewed in the admin page's "Drafts to review" list:
   - The importer loads SOURCE_VERIFIED records as hidden DRAFTs, including in production. The user accepts unreviewed DRAFT rows there, since the listing count is small.
   - The only action is Approve & publish; corrections still go through staging → validator → import.
   - Build order agreed: the admin page (phase 5) comes before testers are invited (phase 6).
   - This supersedes the earlier "importer imports only APPROVED" rule.
3. **Data review items (carried over):**
   - browser-review the 13 SOURCE_VERIFIED records in the admin page (phase 5/6);
   - Per Scholas split (fetch each course page, batch 2);

5. ~~Pipeline go-live~~ **Done (2026-11-09).** See the activity log. Remaining small follow-ups:
   - bump `actions/checkout`/`setup-node` to versions on Node 24 (GitHub deprecation notice) and watch the `ubuntu-latest` → Ubuntu 26 change;
   - optional branch protection on `main` (require CI; PRs);
   - optional: an EB health alarm → email.
   - **Deploy rules now:** every production deploy goes through the pipeline (push to `main` → approve in GitHub). Additive migrations are applied with `sh backend/scripts/with-prod-db.sh npx prisma migrate deploy` **before** approving; destructive ones **after** the code that no longer needs the old columns is live. Never deploy a bundle without `.ebextensions/01-origin-cloudfront-only.config`.
6. **REVISIT (user, 2026-11-10): how to categorize data-center / physical-infrastructure roles.** The AWS Engineering Maintenance Technician listing was tagged **Cloud as a temporary choice** ("chucked it into cloud" while tired). Decide later between: a new track (e.g. "Data centers & infrastructure", needs an additive enum migration + labels), renaming Cloud to "Cloud & infrastructure" (label-only), or keeping Cloud. Also confirm how individual job openings should be shown vs programs (badge? separate filter?). Listings affected so far: `aws-engineering-maintenance-technician`.
6. **Small follow-ups tracked (Claude, 2026-11-09), none blocking:**
   - action-item checkboxes update only after the server round trip (could flip immediately);
   - the admin submissions list shows the first 100 per status, with no pagination;
   - 11 NEEDS_RESEARCH records + the Per Scholas per-course split (research batch 2);
   - inviting the small tester group (this version's stated goal) once the user is happy with v2.

7. **Codex portfolio review recommendations (2026-11-09; proposals only):** README still advertises archived HOH CFP, employer-level tracking, importer-only writes and deferred community/admin functionality; refresh it and the stale handoff summaries. Live MSSA shows CLOSED alongside “Apply on provider’s site”; use availability-aware CTA wording. Clarify program vs individual-job terminology, continue catalog verification/testing, and review whether the live About biography matches the intended anonymity. A dashboard screenshot/walkthrough would expose account-only value to visitors without signup.
   - **Status (Claude, 2026-11-10):** README refreshed (Codex's README finding resolved; see the activity log). **Deferred by the user ("deal with later"):** the availability-aware CTA (don't show "Apply on provider's site" when applications are CLOSED; adjust for UNKNOWN), program vs job-opening terminology (overlaps open question 6), the dashboard walkthrough, and the About biography review (the user wrote and approved that text on 2026-11-10; any change is the user's call).

Resolved and removed from this list:
- Home page update (open item 8, user 2026-11-10): redesigned and built 2026-11-11 from mockup E (see the activity log); awaiting merge/deploy.
- Domain email (user, 2026-11-10): `admin@projectexfilout.org` works. Inbound via ImprovMX forwarding to the user's Gmail; outbound via Gmail "Send mail as" through SES SMTP (IAM SMTP credentials, held by the user). SES: domain + address verified, Easy DKIM SUCCESS, **production access GRANTED** (case 179429319300383), VDM/auto-validation off. DNS: MX, SPF (`include:spf.improvmx.com`), 3 DKIM CNAMEs, DMARC `p=none` (tighten to `quarantine` after a few weeks of clean reports). Test: SES metrics show 1 send, 1 delivery, 0 bounces/complaints. The FAQ now shows `admin@projectexfilout.org`.
- Phase 6 rollout checklist, deploy-method question, deploy bundle hygiene: all done (see the activity log, 2026-11-09). Deploys now go through the pipeline.
- Oracle OVIP official-page check: done (user read the page, 2026-11-09); imported as SOURCE_VERIFIED; awaiting the user's review in Drafts to review.
- EB origin reachable directly (Claude's TRUST_PROXY finding): deployed as `sg-cf-b1a1013` (user go-ahead, 2026-11-09). The SG now allows only `pl-3b927c52` on port 80; direct requests to the elasticbeanstalk.com origin time out; CloudFront 200; live check 12/12; a faked XFF through CloudFront still doesn't change the rate-limit bucket.
- Deploy-outage prevention (Claude's finding, 2026-11-09): the user chose the swap file. Deployed as `swap-b1a1013`; the log shows `swap: enabled /var/swapfile (1024 MB)` before `npm install` (10s).
- `awaitingResearch` migration acknowledgement (Claude's phase 5 proposal): approved by the user, 2026-11-09.
- `.vscode/` (Claude's finding): ignored via root `.gitignore` (user, 2026-11-09).
- `npm audit` (Claude's phase 3 finding): user approved the fix (2026-11-09). Backend production deps and the frontend are now at 0 advisories. Prisma moved to 7.10.1 (CLI, client and adapter kept in step). 2 moderate dev-only advisories remain in `nodemon`'s dependency chain; fixing them needs a breaking `--force` upgrade, and they never ship.
- Signup 500 on missing `branch` (Claude's phase 2 finding): fixed by phase 3 validation.
- Codex's 4 doc findings: applied to the schema and plan docs.
- Username details: proposed per the user's rules.
- DM design questions: deferred with DMs.

## Update protocol — both agents

### Alignment conventions (user request, 2026-11-08). Codex, please follow these too

- **Names:** "Coord" is the user's name for **this file** (`PROJECT_HANDOFF.md`). The agents are **Claude** (VS Code) and **Codex**. Earlier Claude entries wrongly used "Coord" for Codex; those have been corrected.
- **Findings go in two places:** a short log entry **and** an item under "Open questions / decisions needed" (or the decisions table, if the user has decided). Don't leave a decision the user needs to make only in the activity log.
- **Decisions:** when the user decides, add or update a row in "Decisions and proposals" with status `Agreed (user, date)`. Mark replaced rows `Superseded` rather than deleting them.
- **Resolving the other agent's findings:** when a finding is addressed, say so in your log entry and move it to "Resolved and removed from this list", naming whose finding it was.
- **Activity log:** newest entry first, directly under "## Activity log". Heading format: `### YYYY-MM-DD (short label) — Agent`.
- **Source of truth:** the handoff wins over `research/*.md` if they disagree. If you change a research doc, update the handoff in the same session.
- **Before editing:** re-read the file and check `git status`; the other agent may have edited since you last read it. Prefer targeted edits over rewriting sections, and never drop the other agent's entries.
- **Verification claims:** say what you actually ran or read (e.g. "validator: no errors", "read file X"), and what you did not check.

Update this file at meaningful checkpoints, before handing off, and before ending a work session that changes code, data, research, or decisions.

- Refresh the latest implementation state and open questions; remove resolved questions.
- Record decisions as agreed, proposed, or superseded. Distinguish user decisions from agent recommendations.
- Add a dated entry below with what changed, relevant file paths, checks actually performed and their results, blockers, and the next concrete step.
- Explicitly record any database migrations, imports, or deployments actually performed and their target environment.
- Do not include secrets, credentials, personal user data, or unsupported verification claims.
- Preserve the other agent's useful findings. Inspect current files and git status before editing; do not overwrite concurrent work.

## Activity log

### 2026-11-11 (home page redesign, local) — Claude (VS Code) with user
- Mockups: design canvas https://claude.ai/artifact/GUf6rtwNsWeKHrBeGHV9oD (A search-first, B trust-led, C track launcher, **E = chosen**: A's layout + B's slogan + a photo). User asked that copy not claim every listing has a discussion (discussions exist only once someone starts one).
- Built [HomePage.jsx](frontend/src/pages/HomePage.jsx): headline "'Veteran friendly' isn't a plan. A way in is.", hero search (→ `/programs?q=`), track shortcuts (→ `/programs?techTrack=`), "Recently verified" (3 newest `verifiedOn` from `GET /programs`, real `ProgramTile`s with save), steps (search/filter, save/track, "Ask and share": start a discussion or add to one already going), signed-out sign-up callout vs signed-in "Go to your dashboard".
- Photo: public-domain U.S. Air Force photo (Kadena career summit, Feb 2026, A1C Francisco Huerta; Wikimedia Commons, ID 260205-F-BX574-1055), resized to 1200px in [frontend/src/assets/home-career-summit.jpg](frontend/src/assets/home-career-summit.jpg) (bundled/hashed, no hotlink); credit shown as a caption. Old Unsplash hotlinked banner and `PathIllustration.jsx` removed.
- `/` gets `page page-home` (full-bleed sections); the navbar search is hidden on `/` only (the hero has its own).
- Checks: frontend lint + build clean; screenshots desktop light/dark (signed in) and 390px phone, no horizontal scroll, no console errors; new [e2e/tests/home.spec.js](e2e/tests/home.spec.js); full Playwright suite 6/6 passing locally.
- Next: user review, then merge to `main` and approve the pipeline deploy (frontend-only change, no migrations).


### 2026-11-10 (README refresh) — Claude (VS Code)

- Read Codex's 2026-11-09 review entry and open item 7 (kept intact; committed together with this change).
- Rewrote the stale README sections:
  - problem/solution: tech careers, post-separation access, the job-opening rule;
  - a new Features section;
  - the frontend stack row (public directory, client-rendered trade-off);
  - data model (in-app add/edit, importer never overwrites app edits, comments on listings or organizations, ContactMessage);
  - Structure (e2e, research, infra, .github);
  - "What's not in v1" → Roadmap.

  Local dev, tests, CI and deployment sections were already current. No job-search framing in public content.
- Not done (user deferred): the closed-applications CTA, terminology, dashboard walkthrough.

### 2026-11-09 (live site and GitHub portfolio review) — Codex

- Read current handoff and sampled frontend/backend source, importer, integration harness and browser tests; checked GitHub main `a1ca580` and successful run `42775325080` (backend, frontend, browser, release plan and deploy jobs). Local branch differed from main only in handoff/research data at review time.
- Public site inspected in isolated headless Chrome at desktop and 390px: home, browse, About, FAQ, signup, contact, program detail and organization page. Verified URL filter (5 software results), empty search, clear (7 results), modal/Escape/focus return, full-page detail and theme toggle. No page exceptions in page sweep/mobile checks; no horizontal overflow on inspected mobile pages. Review scripts needed timing/locator corrections; these were not app failures.
- Ran local unit tests 36/36, frontend lint and build: pass. Did not create accounts, exercise authenticated/admin writes, rerun DB integration suites, audit security comprehensively or independently verify provider claims. No production writes, imports, migrations or deployments.
- Recommendations (not user decisions): refresh contradictory README/current-state docs; expand verified catalog and gather tester feedback; align closed/unknown application CTA wording and program/job naming; reconsider identifying detail on anonymous About page; add a dashboard screenshot/product walkthrough to the GitHub presentation. See open follow-ups. Only this handoff changed.


### 2026-11-10 (chunks 4–6 live; first batch-workflow listing) — Claude (VS Code) with user

- **Chunks 4–6 deployed** (run 42775325080 approved → success; EB `ci-a1ca580-24` Green). The user applied both migrations first (`migrate status` up to date, drift exit 0). Live check 12/12; org comments 200; favicon `?v=3` served.
- **Batch-workflow trial:** the user sent the amazon.jobs posting 10538970 (Engineering Maintenance Technician, AWS data centers). Claude flagged the scope questions (not veteran-designated; facilities work); the user decided to include it, tagged Cloud (decision above). Claude added the `aws-engineering-maintenance-technician` record to `programs-staging.json` from the posting (official evidence; pay range, quals and schedule quoted); validator OK; prod dry run = `CREATE_DRAFT` ×1, `UNCHANGED` ×14. **Awaiting the user's `--apply`, then review/publish in Drafts to review.**

### 2026-11-10 (chunk 6: edit listings) — Claude (VS Code)

- User request + decision recorded above.
  - Migration `20261110071857_program_edited_in_app` (adds `Program.editedInAppAt`; additive). **Applied locally only.**
  - `GET/PUT /admin/listings/:id`; the importer's `SKIP_EDITED_IN_APP` rule + `--overwrite-app-edits` flag (3 new unit tests).
  - Shared `ListingForm` (add + edit; helpers in `listingFormState.js`); `/admin/listings/:id/edit` page.
  - Edit buttons: public listing page (admins), Drafts, Rejected ("Fix & return to drafts"), listing-update submissions. The admin submissions hint now explains the note goes to the submitter's My submissions.
- The user's "note did nothing" was checked on prod (read-only): the note was saved on the accepted submission. It shows on the submitter's My submissions (no notifications yet, by design). The Amazon SDE Apprentice listing is tagged SOFTWARE_DEV only in staging; the user can add Cloud via Edit once deployed (the importer will then keep the app copy).
- Tests: unit 36/36, integration 9/9, e2e 5/5 (admin spec edits a live listing), lint and build clean.
- **Release queue:** chunk 3 **deployed** (run 42772008391 success; EB `ci-a3561ba-19` Green; `/contact/mine` 401 as expected). Next: apply the prod migrations `20261110070704_organization_comments` and `20261110071857_program_edited_in_app` (both additive), push `main` (chunks 4 + 5 + 6), and approve.

### 2026-11-10 (chunk 5: icon B + organization discussions) — Claude (VS Code)

- **Icon:** the user picked option B ("Exfil arrow") from the icon canvas https://claude.ai/artifact/NZdm5FJZ9FmedKeU5foede.
  - `favicon.svg` and `apple-touch-icon.png` were re-rendered; the navbar uses `ExfilMark.jsx` (same drawing, theme colors).
  - Icon links are versioned `?v=3` so browsers drop the cached Vite icon.
- **Home copy:** the signup link now mentions discussing programs and employers.
- **Organization discussions (user request):** comments on organization pages, same rules as listing comments.
  - Additive migration `20261110070704_organization_comments`: `Comment.programId` becomes nullable, plus a new nullable `organizationId` (FK RESTRICT) and an index, plus CHECK `Comment_exactly_one_target` (exactly one of programId/organizationId). **Applied locally only.**
  - `GET/POST /organizations/:slug/comments` (visible when the org has a public program, like its page). The comment controller was generalized via `findTarget(kind)`.
  - The thread endpoint returns `target {kind, slug, name}` (keeps `program` for listing threads). Reports and the admin report queue handle org comments.
  - Frontend: `CommentsSection`/`CommentComposer`/`CommentNode` take `basePath`; the org page has a Discussion section; the thread page links back to the right target.
  - Tests: `orgDiscussion.test.js` (20 checks, incl. no cross-discussion replies); a community e2e step. Unit 33/33, integration 8/8 suites, e2e 5/5, lint and build clean.
- **Release queue (feature branch, in order):** chunk 3 (contact/About/FAQ) is on main awaiting approval (run 42772008391). Next push to `main` ships chunk 4 (add listing, no migration) + chunk 5 (**migration `20261110070704_organization_comments` must be applied to prod first**: additive, safe for the running code).

### 2026-11-10 (chunk 3 awaiting approval; chunk 4 built) — Claude (VS Code)

- Chunk 3: the user applied `20261110054723_contact_messages` to prod (verified: migrate status up to date); pushed `main` (a3561ba) → run **42772008391**, waiting for the user's approval.
- **Chunk 4 built (feature branch only):** admin **Add listing** tab.
  - `POST /admin/listings` → creates a DRAFT (with an optional new organization), `contentHash` via the importer's `contentHashFor`, then the normal Drafts to review → Approve & publish path.
  - Rules in [listingInput.js](backend/src/lib/listingInput.js) mirror the validator: https official page required, veteran route required + an "I read the official page" confirmation, ≥1 tech track, verifiedOn not in the future, slug format/uniqueness, (org, name) unique, a "guarantee" warning. `GET /admin/organizations` feeds the picker.
  - Admin-added listings live only in the DB, not `programs-staging.json`. A later import of the same slug would update them by the normal transition rules.
  - Tests: unit 33/33 (+5), integration 7/7 suites (`listings.test.js`, 15 checks), e2e 5/5 (admin spec adds a listing).
- Fixes: modal focus now returns to the opening card after close (an effect on `listing` clearing, not a timeout); favicon links versioned `?v=2`, because browsers had cached the old Vite icon.
- The user asked for **favicon/icon drafts** as a design canvas; in progress.

### 2026-11-10 (redesign live; domain email in progress) — Claude (VS Code) with user

- **Chunk 2 (Direction D redesign) deployed:** pipeline 42764247483 approved by the user → success; EB `ci-5bce5b6-14` Green; live check (6 tiles, modal opens, Escape closes, dark toggle, no console errors).
- **Domain email (user chose option 2: forwarding + send-as via SES):**
  - Part 1: the user set up ImprovMX with alias `admin` → their Gmail, and added the DNS records themselves (Claude was blocked from DNS changes): MX `10 mx1.improvmx.com` / `20 mx2.improvmx.com`, TXT `v=spf1 include:spf.improvmx.com ~all` in Route 53 zone `Z0566093Q0XRW5U17QYO`. Verified via `dig` (Google DNS + Route 53 authoritative).
  - Remaining: (2) SES domain identity with Easy DKIM, publishing records to Route 53 from the console; (3) request SES production access + create SMTP credentials (stored by the user, never in the repo); (4) Gmail "Send mail as" `admin@projectexfilout.org` via `email-smtp.us-east-1.amazonaws.com:587` (TLS); then a DMARC TXT `_dmarc` (`p=none` to start), test, and swap the FAQ email (open item 6).
- Domain email finished (see open questions → resolved). The FAQ was switched to `admin@projectexfilout.org`.
- Chunk 3 (contact, About, FAQ) still waits: run its migration on prod, then push `main` → approve.

### 2026-11-10 (chunk 2 to main; chunk 3 built) — Claude (VS Code)

- Chunk 2 (Direction D redesign) final checks: unit 28/28, integration 5/5 suites, e2e 4/4, lint and build clean; no migrations. Pushed to `main` (5bce5b6) → pipeline run **42764247483**, waiting for the user's approval.
- **Chunk 3 built (on `feature/programs-directory`, NOT on main yet; pushing main would cancel the waiting chunk 2 run):**
  - **Contact admin:** additive migration `20261110054723_contact_messages` (ContactMessage + ContactStatus OPEN/RESOLVED), applied locally only.
    - `POST /contact`: auth; suspended users allowed so they can ask about it; subject 1–120, body 1–3,000; 5/day.
    - `GET /contact/mine`.
    - Admin `GET /admin/messages?status=`, `POST /admin/messages/:id/reply` (reply → RESOLVED, once); summary `openMessages`.
    - UI: `/contact`, `/account/messages`, admin **Messages** tab. The navbar "Contact" shows for non-admins.
  - **About** (`/about`) and **FAQ** (`/faq`, 12 Q&As) pages, drafted from project facts. **Placeholders for the user:** About → "Who runs it"; FAQ → "I forgot my password" (how to reach the admin off-site).
  - Navbar: About, FAQ, Contact. New footer links: About · FAQ · Contact · Suggest a program.
  - Tests: new `contact.test.js` (23 checks) and `e2e/tests/pages.spec.js` (About/FAQ + the full send → reply → read loop). All green: integration 6/6 suites, e2e 5/5, lint and build.
  - **Deploy order for chunk 3:** apply the migration first (`sh backend/scripts/with-prod-db.sh npx prisma migrate deploy`; additive), then push `main` → approve.
- Follow-up noted: on phones the logged-in navbar wraps to 3 rows; a collapsible menu would be tidier.
- The user supplied the About "Who built it" text (inserted verbatim) and chose their personal email for the FAQ password-reset answer for now; the domain-email reminder is in open questions item 6.
- Remaining v2: chunk 4, admin "Add listing" (form → DRAFT).

### 2026-11-09 (STOPPING POINT: chunk 2 redesign WIP) — Claude (VS Code)

**Resume here.** The user hit their usage limit; work stopped mid-chunk 2.

- **Chunk 1** (search, unsave, home when logged in, favicon) was pushed to `main` (68250bb); the pipeline run 42753726255 was approved by the user. **Verified: deployed** (pipeline success; EB `ci-68250bb-8` Ready/Green; live `/programs?q=vets` 200).
- **Chunk 2 = Direction D redesign: built, committed as WIP on `feature/programs-directory` only (NOT on main, NOT deployed).** Done:
  - backend multi-value filters (`?techTrack=CLOUD,DATA`, any-of; integration 41/41);
  - theme system (light default, `[data-theme=dark]` = old colors, saved in localStorage `exfil-theme`, applied pre-paint in `index.html`; Inter font);
  - `NavBar.jsx` (site search → `/programs?q=`, ThemeToggle, avatar) and `ThemeToggle.jsx`;
  - `ProgramTile.jsx` (card + save toggle; whole card clickable; phones navigate to the page);
  - `ProgramModal.jsx` (native `<dialog>` + blurred backdrop; Escape/✕/backdrop close; `?listing=slug` in the URL; Back closes);
  - `ProgramSummary.jsx` (shared by the modal + the detail page);
  - `ProgramsPage.jsx` rewritten as D (sidebar checkboxes, tile grid);
  - org page uses tiles; `ProgramCard.jsx` deleted; `index.css` fully rewritten (tokens for both themes, dark buttons use dark text on the light accent for contrast).
  - Screenshots checked: browse light/dark, modal light/dark, phone 390px (no horizontal scroll), detail page. All good.
- **e2e: FIXED, 4/4 passing (commit after 1a70556).** The fixes below were applied; next: run backend `npm test` + `npm run test:integration`, lint/build, then merge to `main` → pipeline → user approves. Original notes:
  1. `accounts.spec.js` + `community.spec.js` username steps use `fill("input", …)`, which now hits the **navbar search input** first. Change to `getByLabel("Username")`.
  2. `directory.spec.js` checkbox step: the checkboxes are controlled (they update after the URL changes), so Playwright's `.check()` complains. Use `.click()` then `expect(...).toBeChecked()`.
  3. `directory.spec.js` ~line 107 still uses `.employer-card` (browse is now `.tile`); review the remaining steps for the new structure.
  - Then run backend `npm test` + `npm run test:integration` and `cd e2e && npm test`, check lint/build, then merge to `main` → pipeline → user approves.
- **Remaining v2 after chunk 2:**
  - chunk 3: About page, FAQ page (Claude drafts copy, user edits), contact-admin (form + admin Messages tab + "My messages"; additive migration; navbar "Contact" for logged-in non-admins);
  - chunk 4: admin "Add listing" form → creates a DRAFT (same required fields as the validator).
  - Add About/FAQ/Contact links to the NavBar when those pages exist.

### 2026-11-09 (v2 chunk 1 + design mockups) — Claude (VS Code)

- **Design mockups** for the user to choose from: https://claude.ai/artifact/A6wxmK1z1FmNCtQQSkfEkm (private to the user), browse screen only, light default with a working dark/light switch:
  - A: search bar + list/detail split (Indeed-style);
  - B: filter sidebar + card grid with save toggles (Handshake-style);
  - C: search-first hero + slide-out detail drawer.

  Real listing data; patterns only, no third-party branding.
- The user liked A and B and asked for B with an A-style detail card. Added **D** to the canvas: B's filter sidebar + cards (save toggles); clicking a card opens an A-style detail panel (apply, save, veteran route, details, link to the full page, close). While open, cards stack in one column beside it; closed, they spread into a grid. Revised per the user: details now open as a **modal** centered over an unchanged grid; the page behind dims and blurs; it closes with ✕, a background click (Escape too, in the real build), and "Open full page →". **Awaiting the user's confirmation of D.** Build notes: use a real `<dialog>` (focus trap, Escape, return focus to the card), reflect the open listing in the URL (`?listing=slug`) so it's shareable and Back closes it, and on phones navigate to the full page instead of a modal.
- **Chunk 1 (no migration):**
  - keyword search: `GET /programs?q=` matches program name, organization or description (case-insensitive, max 100 chars; drafts never match); search box on browse, kept in the URL;
  - **unsave**: `DELETE /saved-employers/program/:programId` deletes the save + its action items (confirm prompt in the UI); Save button toggles; dashboard "Remove";
  - `/` shows the home page when logged in (CTA "Go to your dashboard");
  - custom favicon (`frontend/public/favicon.svg`, compass on #6d28d9) + `apple-touch-icon.png` (180px, rendered with Playwright) + theme-color/description meta.
- Checks: unit 28/28; integration 5/5 suites (programs 24 → 38 checks: search + unsave); e2e 4/4 (directory spec: search, unsave both ways, home when logged in); lint and build clean.

### 2026-11-09 (v2 wrap-up planning) — Claude (VS Code)

- Checked the user's list against the code: unsave is missing (no DELETE route); the favicon is Vite's default; `/` redirects logged-in users to `/programs`; the theme follows the OS only; there's no search, contact, About/FAQ or admin add-listing. The user's decisions are recorded in the decisions table. Starting with the design mockups, then chunk 1.

### 2026-11-09 (pipeline live + contract done) — Claude (VS Code) with user

- The user re-ran `setup.sh` (trust policy now uses the immutable subject). Claude pushed `main` (8c4472e); pipeline run **42750145030**: checks + release plan green → the user approved → **deploy succeeded**:
  - OIDC login OK; CI-built bundle; EB **Immutable** deploy took 11 min (new instance `i-096dc62965db4d364`, old `i-029932c89159cd7cf` terminated); API smoke OK (no rollback); frontend synced + invalidated; site smoke OK.
  - Verified on the new instance: `eb-engine.log` says "found node modules dependencies, skip installing dependencies"; swap enabled; the SG is still CloudFront-only (direct origin blocked); env vars incl. `TRUST_PROXY` carried over; cache headers (`index.html` no-cache, assets 1-year immutable); live check 12/12.
- **Contract migration applied by the user** (`with-prod-db.sh npx prisma migrate deploy` → `20261110024000_contract_drop_legacy_employer`). Verified: `migrate status` up to date; `migrate diff` against `schema.prisma` exit 0 (no drift); 2 saves, 0 unmapped; programs unchanged; live check 12/12.
- **Production now:** EB version `ci-8c4472e-4`; schema fully contracted; 6 PUBLISHED, 7 DRAFT, 1 REJECTED, 2 ARCHIVED; 2 users.
- The expand → backfill → switch → contract migration is complete. Snapshots `vetpath-db-before-phase6`, `-before-contract`, `-before-contract-2` exist (manual; they cost storage; delete when no longer wanted).

### 2026-11-09 (first pipeline run) — Claude (VS Code)

- After the user's setup steps: verified the `workflow` scope, the role + policies, and EB DeploymentPolicy=Immutable (the config update finished 03:18 UTC, Green).
- Pushed `feature/programs-directory` → **CI green on GitHub on the first run** (backend, frontend, e2e). Fast-forwarded and pushed `main` (7b15a7b). The release plan correctly flagged 4 migrations (3 already applied in prod; the contract is pending and runs after the deploy).
- The user approved the deploy; it failed at `configure-aws-credentials` (OIDC subject mismatch, see open question 5). Production untouched (`sg-cf-b1a1013`, Green). The contract migration was deliberately **not** run.
- CI notices to handle later: `actions/checkout@v4` targets the deprecated Node 20; `ubuntu-latest` moves to Ubuntu 26.

### 2026-11-09 (CD pipeline built; go-live pending user steps) — Claude (VS Code)

- The user asked to push, deploy the contract, and build the pipeline.
  - **Push:** rejected by GitHub (token lacks the `workflow` scope).
  - **Contract deploy:** blocked by Claude Code's safety check; production is unchanged (live version `sg-cf-b1a1013`, old tables still present). Took a fresh snapshot `vetpath-db-before-contract-2` (pre-check: 0 unmapped saves).
- Built CD in `.github/workflows/ci.yml`: a `release-plan` job (commits + migration warning in the run summary) and a `deploy` job on GitHub environment `production`.
  - The deploy job uses OIDC to AWS and [build-ci-bundle.sh](backend/scripts/build-ci-bundle.sh) (Linux prod deps pre-installed, so EB skips `npm install`; 95 MB; refuses without the SG config or swap hook).
  - It deploys to EB and waits via [.github/scripts/wait-eb.sh](.github/scripts/wait-eb.sh), runs the API smoke test ([smoke.sh](.github/scripts/smoke.sh)) with auto-rollback to the previous version, syncs the frontend (assets: 1-year immutable; `index.html`: no-cache), invalidates CloudFront, then runs the site smoke test.
  - Checked locally: YAML parses; the smoke script passes against live; the bundle builds from a copy and the server runs from it.
- [infra/github-deploy/](infra/github-deploy/): `trust-policy.json` (only `repo:MarcoGarcia650/project-exfil:environment:production`), `frontend-policy.json` (one bucket + one distribution), `setup.sh` (OIDC provider, role with AWS-managed `AdministratorAccess-AWSElasticBeanstalk` + the frontend policy, EB Immutable). **setup.sh was blocked for Claude ("Permission Grant"); the user must run it.** `github-env.sh` ran successfully and was verified.
- Moved the production-DB helper into the repo: [with-prod-db.sh](backend/scripts/with-prod-db.sh) (the scratchpad copy was temporary).
- Not verified yet: whether EB on AL2023 skips `npm install` when `node_modules` is in the bundle (check `eb-engine.log` on the first pipeline deploy); the first real CI/CD run.

### 2026-11-09 (local dev + tests in repo + CI) — Claude (VS Code)

- User asked for professional local testing and CI before more v2 work (deploy pipeline/CD comes later; contract deploy and pushing `main` still on hold).
- `npm run db:reset` ([dev-reset.js](backend/prisma/dev-reset.js)): local-only rebuild (refuses non-localhost; asks to confirm), imports and publishes verified programs locally, creates `admin@example.com` / `user@example.com`. Prisma blocks `migrate reset` when an AI agent runs it unless the user consents explicitly; the user did ("yes, reset my local database"), and the local DB was reset: 2 users, 14 published, 0 comments.
- HTTP integration tests moved into the repo: [backend/test/integration/](backend/test/integration/), 5 suites / 193 checks in about 13s against a separate `exfil_test` DB with fixed fixtures. The harness refuses non-`*_test` DBs and non-local hosts outside CI. `npm run test:integration`. The two importer-against-staging checks were dropped (they'd overwrite fixtures; the importer has unit tests).
- Browser tests moved into the repo: [e2e/](e2e/) with `@playwright/test` 1.64.1, 4 specs. The config starts a test API (:4100) and frontend (:5174). Locally they use installed Chrome; CI installs Chromium.
- CI: [.github/workflows/ci.yml](.github/workflows/ci.yml), with backend, frontend and e2e jobs on Postgres service containers. Simulated locally step by step (all green). The drift check was confirmed to fail (exit 2) on an unmigrated schema change. **Not yet run on GitHub: it needs a push (on hold).**
- The ad-hoc scratchpad suites are superseded by the repo tests.

### 2026-11-09 (CloudFront-only origin, deployed) — Claude (VS Code)

- With the user's go-ahead, deployed EB version `sg-cf-b1a1013` (the live `swap-b1a1013` code + `.ebextensions` SG override). Green in about 90s. Verified the SG rule, CloudFront 200, direct origin blocked, live 12/12, rate-limit probe OK. Deleted the stale local contract zip that lacked the config.

### 2026-11-09 (CloudFront-only origin, prepared) — Claude (VS Code)

- User: hold the contract deploy and the push of `main` (merged locally, fast-forward at `e9753f0`); add the security-group change through EB config.
- Added `.ebextensions/01-origin-cloudfront-only.config` (CloudFront origin-facing prefix list `pl-3b927c52`, looked up via `describe-managed-prefix-lists`). The SG's logical ID `AWSEBSecurityGroup` and the API distribution's origin (`http-only`, port 80, EB CNAME) were confirmed read-only. Built a live-code + config bundle so it can ship without the contract. **Not deployed; awaiting the user's go-ahead.**

### 2026-11-09 (live test, TRUST_PROXY, contract) — Claude (VS Code)

- **Logged-in live test** (user approved): a throwaway `exfil-smoke-*@example.com` account covered signup + username, save, reload, dashboard status and action item, my submissions, comment box visible, admin API 403, and re-login with different email case. **13/13.** Private features only (no comments, reports or submissions). The account and its rows were deleted afterwards; production is back to 2 users and 1 save. Minor UX note: action-item checkboxes update only after the server round trip.
- **TRUST_PROXY=2 set on EB** (user approved). The before/after rate-limit probe on `/auth/reset-password` (bogus tokens, no side effects) showed that before, *all* traffic shared one bucket (127.0.0.1), making per-IP limits site-wide. After: CloudFront traffic is keyed per viewer, and a faked XFF through CloudFront doesn't change the bucket. A direct-to-origin faked XFF does, which is the open item above.
- **Contract step** (user asked): migration `20261110024000_contract_drop_legacy_employer` (guarded: aborts if any SavedEmployer lacks programId) drops `Employer`, `employerId`, `ProgramType` and makes `programId` required. Retired `seed.js` and `migrate-legacy-employers.js`. Fixed `listSavedProgramIds`, which filtered on the now-required column (500s, caught by the browser suites). Local: all suites green after clearing piled-up local test data (101 pending submissions exceeded the admin list's 100-row page; noted, not changed). Commit `ddcc924`.
  - Production: precheck shows 0 unmapped saves; RDS snapshot `vetpath-db-before-contract` is available. **Backend deploy `contract-ddcc924` blocked by Claude Code's safety check; not yet deployed.** Order: deploy the backend first (it works with both schemas), then `migrate deploy`.

### 2026-11-09 (Oracle import + swap) — Claude (VS Code)

- With the user's go-ahead: production `import-programs.js --apply` → `UPDATE_DRAFT oracle-ovip`. Re-run: 14 UNCHANGED. `awaitingResearch` is now empty. Oracle is a hidden DRAFT awaiting the user's review in the admin page.
- With the user's go-ahead ("deploy it"): added `.platform/hooks/prebuild/01_swap.sh` (plus the confighooks copy; idempotent 1 GB `/var/swapfile`, persisted in fstab) and deployed EB version `swap-b1a1013` (45s, Green). The swap was confirmed in `eb-hooks.log`; the live check passed 12/12.
- Production now: 5 PUBLISHED, 9 DRAFT (incl. Oracle), 2 ARCHIVED, 0 REJECTED.
- Next: the user reviews the remaining drafts (incl. Oracle); a logged-in smoke test on production (needs a test account: ask first); `TRUST_PROXY` header check; invite testers; later the contract migration and merging `feature/programs-directory` into `main`.

### 2026-11-09 (reject deploy + ~23 min outage) — Claude (VS Code)

- The user asked Claude to deploy the reject feature itself. The migration `20261110014820_program_rejected_status` applied. The EB version was uploaded from the tested zip via the AWS CLI.
- **Outage 01:53–02:16 UTC (~23 min):** on the `t3.micro` (about 1 GB RAM, no swap), `npm --omit=dev install` stalled for **17 minutes**. The same step took about 12s at 01:23 and again at 02:15. EB's 10-minute command timeout aborted the deploy, the instance stopped answering EB, and the API returned 504.
  - The user approved an EC2 reboot (`i-029932c89159cd7cf`), which Claude ran.
  - After the reboot the instance had the new code on disk but EB still recorded the old version, so Claude redeployed `reject-a38aebe` (30s, Green) to make them match.
  - Logs: `eb-engine.log` shows "added 241 packages … in 17m". Most likely cause: memory pressure.
- Oracle: staging updated from the official page as read in the user's browser (`51d28f9`). The production dry run shows only `UPDATE_DRAFT oracle-ovip`, awaiting the user's go-ahead to apply.
- Open: add swap on the instance (or a larger instance) and/or raise the EB command timeout, so a stalled install can't take the site down again.

### 2026-11-09 (reject drafts) — Claude (VS Code)

- The user became admin and published 5 listings in production. They asked for a reject action (built as a hidden REJECTED status; user decision) and asked how to clear Oracle (it needs the official page read in a browser, then a staging update and re-import).
- Built and tested reject locally (details under "Latest implementation state"). Not deployed yet.

### 2026-11-09 (phase 6: production deploy) — Claude (VS Code) with user

- Deployed phases 1–5 to production (steps and checks under "Latest implementation state" → PRODUCTION). Every write step had the user's go-ahead; the user performed the console steps and ran the DB-writing commands.
- Added `backend/.ebignore` and `backend/scripts/make-deploy-zip.sh` (no `.env` or `node_modules` in bundles).
- Next: step 7, make the user's account admin, then review and publish drafts.

### 2026-11-09 (phase 5 complete, local) — Claude (VS Code)

- Built the admin page (details under "Latest implementation state").
- **Schema:** added and applied (local Docker only) migration `20261110003637_program_awaiting_research`, so the legacy Oracle NEEDS_RESEARCH draft can't be published by mistake. Recorded as a proposal awaiting user acknowledgement.
- Checks run: unit 25/25, admin HTTP 50/50, admin browser 17/17, all earlier suites green; phone-width fixes for the navbar and long URLs.
- Local test data: `P5*`/`E5*`/`Shot5_*` users (none admin now), hidden comments, reviewed submissions, used reset tokens. Test publishes were reverted.
- No production DB, migration, import or deploy work.
- Next: phase 6 (production + testers). Every production step needs the user's explicit go-ahead; see the rollout checklist in open questions.

### 2026-11-09 (phase 4 complete, local) — Claude (VS Code)

- Built community features (details under "Latest implementation state"): threaded comments, reports, submissions, thread view, suggestion form, and the my-submissions page.
- Added `.vscode/` to the root `.gitignore` (user approved).
- Checks run: unit 23/23, HTTP 58/58, browser 17/17, plus phase 2/3 regressions.
- Local test data: `P4*`/`E4*` users (`p4-*`, `e2e-p4*@example.com`); comments on vetswhocode-accelerator and hoh-corporate-fellowship, including 22 `page-*` rows inserted by SQL and one hidden by SQL; reports; submissions. All local only.
- No production DB, migration, import or deploy work.
- Next: phase 5 (admin page: role + requireAdmin, first-admin script, reports queue, submissions review, user lookup/suspend/reset link, Drafts to review → Approve & publish).

### 2026-11-09 (dependency audit fixes) — Claude (VS Code)

- User approved `npm audit fix`. Backend: 8 prod advisories → 0. Prisma CLI, `@prisma/client` and `@prisma/adapter-pg` aligned at 7.10.1, and the client was regenerated. Frontend: 2 high (Vite/launch-editor, source-map-js) → 0. Not fixed: 2 moderate dev-only advisories (nodemon chain; needs `--force`).
- Checks run after updates: `npm test` 18/18, `prisma migrate status` up to date, importer dry run (13 UNCHANGED), HTTP smoke 39/39, browser 24/24 + 14/14, frontend build and lint clean.
- Phase 6 note: the deploy must run `npm ci` so EB gets Prisma 7.10.1 and regenerates the client.
- Open: `.vscode/` (explained to user, awaiting choice).

### 2026-11-09 (phase 3 complete, local) — Claude (VS Code)

- Built account hardening (details under "Latest implementation state"): validation, lowercase emails, DB-backed sessions with `tokenVersion`, read-only suspension, rate limits, usernames (signup and set-once for existing accounts), reset links via script, and the reset page.
- Added dependency: `express-rate-limit` ^7.5.1 (backend).
- Checks run: `npm test` 18/18, HTTP smoke 39/39, browser 14/14, Phase 2 browser regression 24/24, build and lint.
- Local test data: `Smoke3-*`/`e2e-p3-*@example.com` users; the phase 2 smoke user now has a username; a few used/expired reset tokens.
- No production DB, migration, import or deploy work.
- Next: phase 4 (community: comments, reports, submissions). Open: `.vscode/`, `npm audit fix` decision.

### 2026-11-09 (phase 2 complete, local) — Claude (VS Code)

- Built the public directory (details under "Latest implementation state"): org endpoint, saved-ids endpoint, public browse with URL filters, program and organization pages, empty/not-found states, `/employers` redirect, return-after-login, dashboard archived-label fix.
- Checks run: backend smoke 14/14, `npm test` 10/10, headless Chrome end-to-end 24/24, phone/dark screenshots, `vite build`.
- Local test data added: one `smoke-p2-*@example.com` user, which saved the one PUBLISHED program.
- No production DB, migration, import or deploy work.
- Next: phase 3 (account hardening). Open: `.vscode/` handling.

### 2026-11-09 (phase 1 complete, local) — Claude (VS Code)

- Moved the repo to `~/projects/VetTool` at the user's request: force-downloaded 187 offloaded files, then rsync-copied excluding regenerable dirs. Verified with a checksum diff (identical), `git fsck` (no errors) and a fresh `npm ci`. Prisma CLI startup went from 14s+/hangs to 1s.
- Finished phase 1 locally: endpoint smoke tests (26/26), frontend switch, headless end-to-end (8/8), build OK. Committed on `feature/programs-directory`.
- Copied Claude's project memory to the new path's memory folder.
- No production DB, migration, import or deploy work.
- Next: phase 2 (public directory). Open: the user to confirm deleting the old iCloud copy.

### 2026-11-08 (phase 1, part 1) — Claude (VS Code)

- Built and verified the phase 1 data layer on the local DB (details under "Latest implementation state"). Committed on `feature/programs-directory`.
- Hit an environment blocker: iCloud has offloaded the project's `node_modules` and parts of `.git`. Paused for the user's decision.
- No production DB, migration, import or deploy work.

### 2026-11-08 (go-ahead) — Claude (VS Code)

- User approved the schema, switched to agentic implementation (the user owns major decisions), and approved committing the planning files and starting the local DB.
- Local DB: started the `vetpath-db` Docker container. It's at migration `20260809182550_init` with 1 user, 5 employers, 0 saved employers and 0 action items. `backend/.env` points at localhost, not RDS.
- Next: commit the planning files on a feature branch, then phase 1 (local only).

### 2026-11-08 (Codex follow-up applied) — Claude (VS Code)

- Checked Codex's follow-up review; all 5 findings confirmed against the docs. User chose option (a) and said yes to all 5.
- `research/IMPORT_AND_MAINTENANCE_PLAN.md`: removed the leftover "set PUBLISHED/ARCHIVED" line; added the import state-transition table (changed PUBLISHED → DRAFT with review metadata cleared; unchanged keeps state; archives never republished; explicit `restore` → DRAFT; `verifiedOn`-only updates don't unpublish).
- `research/SCHEMA_PROPOSAL.md`:
  - `contentHash`/`reviewedContentHash`;
  - DRAFTs excluded from every public endpoint (savers see "Under review");
  - admin lookup by username or private email;
  - reset links only via a verified account-owner channel;
  - proxy trust matched to the real CloudFront → nginx path.
- Added "Alignment conventions" under the update protocol at the user's request. Fixed Claude's earlier misuse of "Coord" for Codex.
- No code, schema, DB or deploy work.

### 2026-11-08 — Codex follow-up review

- Read the updated handoff, schema proposal and import plan. Previous community-document findings are addressed. No source reverification or code tests performed in this documentation review.
- Remaining review-gate contradiction: the import plan allows content changes to PUBLISHED rows while keeping them public, bypassing review of those changes. Recommendation for this version: changed published content returns to DRAFT and clears approval metadata; unchanged reimports preserve state. Alternatively preserve the public version and stage revisions, but that adds complexity. User decision needed on temporary unpublishing versus revision staging.
- Import plan also still says to set publishStatus to PUBLISHED/ARCHIVED, contradicting DRAFT-only import. Specify transitions for new, unchanged, changed published and archived records; never silently republish an archive.
- Admin user lookup must support private email lookup as well as usernames: legacy users without usernames still need password reset help. Deliver reset links only through a verified account-owner channel.
- Implementation checks to carry forward: DRAFT records and their content must be excluded from every public detail/search/organization endpoint; published review metadata should describe the content actually reviewed. Proxy trust must match the actual CloudFront/nginx path rather than blanket trust of client-forwarded IP headers.
- No implementation, migration, import, database or deployment changes. Schema approval remains pending.

### 2026-11-08 (review gate moved) — Claude (VS Code)

- User decision: review listings in the admin page. SOURCE_VERIFIED records import as hidden DRAFTs, including in production; Approve & publish is status-only; build order is the admin page before testers.
- Updated `research/SCHEMA_PROPOSAL.md` (reviewedById/reviewedAt, the gate steps, the 4th admin list), `research/IMPORT_AND_MAINTENANCE_PLAN.md` (pipeline, review section, importer rules) and the phase table here.
- No code, schema, DB or deploy work.

### 2026-11-08 (phase 0 answers) — Claude (VS Code)

- Applied the user's data answers to `research/programs-staging.json` (Salesforce IT_SUPPORT; Amazon all tracks; Oracle eligibility recorded as user-provided, not verified). Validator: no errors.
- Schema approval is on hold (user).
- Recorded the user's request to review listings in the admin page, plus Claude's proposed "Drafts to review" design and its implications. Awaiting the user's decision.
- No code, schema, DB or deploy work.

### 2026-11-08 (defaults accepted) — Claude (VS Code)

- The user accepted Claude's defaults: oldest-first comments, no new replies to hidden comments, and testers contact the user for resets. All design questions for this version are closed; the schema is ready for the user's approval. No code, schema, DB or deploy work.

### 2026-11-08 (decisions round) — Claude (VS Code)

- Recorded the user's answers on password reset (admin-link fallback; SES deferred), reply depth, hidden-comment display, link previews and limits.
- Added a `PasswordResetToken` sketch and the reset flow to `research/SCHEMA_PROPOSAL.md`, with comment display rules.
- Updated phases 3 and 5 of the plan.
- Recorded the user's design preference (Indeed-style UI) for the separate redesign track.
- 3 small items remain open (see open questions). No code, schema, DB or deploy work.

### 2026-11-08 (scope lock) — Claude (VS Code)

- Recorded the user's version scope after review with Codex. DMs and notifications are deferred together, and there's no further scope expansion.
- Inspected the existing app: auth controller/routes, `requireAuth`, `app.js`, the dashboard and action-item controllers, `App.jsx`, `api.js`, the signup page, and backend/frontend dependencies. Findings are in "Findings from inspecting the existing app". The key one is that password reset does not exist.
- Reconciled `research/SCHEMA_PROPOSAL.md` (rewritten):
  - archived listings take comments; listings show their verified date;
  - `ApplicationAvailability` is separate from `PublishStatus`;
  - a proper `Comment` parent/replies self-relation, plus same-program validation;
  - corrected the veteran-access verification claim;
  - username rules, roles, suspension and `tokenVersion`; limits and rate limits;
  - the minimal admin page.
- Updated `research/IMPORT_AND_MAINTENANCE_PLAN.md`: importer as the single listing write path; availability mapping; archive behaviour; submissions feed the pipeline; admin page in scope, with listing editing deferred.
- Added a proposed phased implementation plan and refreshed open questions.
- No app code, schema, migration, DB, import or deploy work. `programs-staging.json` and the validator are unchanged; aligning them to the 4 availability values is a phase 1 task.

### 2026-11-08 (after Codex review) — Claude (VS Code)

- Reviewed Codex's entry and confirmed all 5 findings against the files (details under open questions).
- Recorded user decision: usernames are the only public identifier. Recorded the user's DM proposal as in design, with the open safety and moderation questions.
- Only this handoff was edited. The proposal and plan docs are unchanged, pending the user's go-ahead. No code, schema, DB, import or deploy work.
- Follow-up: recorded that DMs and notifications are coupled (user), the in-app vs email/push distinction, and Claude's recommendation to defer both until after tester feedback. The timing decision is still the user's.

### 2026-11-08 — Codex review

- Read the handoff, schema proposal, and import/maintenance plan. Ran the staging validator: 25 programs, 13 SOURCE_VERIFIED, 12 NEEDS_RESEARCH, 0 APPROVED; no errors. This checks staging consistency, not source accuracy; no independent web verification performed.
- Review findings to resolve before implementation: sync the proposal's superseded community questions and archive behavior with the agreed decisions; update the maintenance plan's "No admin UI" statement to distinguish the agreed moderation/submission admin page from deferred direct listing editing.
- Threading needs an actual self-relation and validation that replies reference comments on the same program. A required veteran-route string alone does not establish verified eligibility; publication checks must enforce reviewed evidence and verification metadata.
- Recommendation: decide how community authors are identified publicly before implementation. Do not expose account email addresses as comment author labels. Consider a display name or handle.
- No application code, schema, database, import, migration, or deployment changes. Schema approval remains pending.

### 2026-11-08 (latest) — Claude (VS Code)

- Recorded the user's community-feature decisions:
  - submissions go to the admin and are never auto-applied;
  - public read access, with an account required to interact;
  - every comment shows its posted timestamp, with no summary label;
  - reactive moderation via report, hide and suspend;
  - a minimal admin page;
  - threaded comments;
  - listings show the "last verified" date;
  - archived listings stay open for new comments;
  - no notifications this version.
- Added a draft "Community models" section to `research/SCHEMA_PROPOSAL.md` before the final four answers. That section's "Still open" list is now superseded by this handoff.
- On the user's instruction, only this handoff was updated after the final answers. No code, schema, DB, import or deploy work. Validator state unchanged (25 programs, no errors).
- Next step: the user discusses the proposal with the other assistant, then approves the schema or asks for changes.

### 2026-11-08 (later) — Claude (VS Code)

- Recorded the user's answers: separate listings per program or designated role under each employer; archived listings shown with a reason; Amazon hub saves migrate to the Technical Apprenticeship; Per Scholas to be split; schema on hold pending the community-features design.
- Added 3 Amazon military-designated SDE records. Two are verified via amazon.jobs search JSON (official) on 2026-11-08; the intern role is NEEDS_RESEARCH, with no live posting.
- Drafted user-facing `archiveReason` text for the Amazon hub, HOH CFP and VetsinTech seed rows. Updated `research/SCHEMA_PROPOSAL.md` (archive fields, on-hold status).
- Validator: 25 programs, no errors. Still no DB writes, migrations, imports or deploys.

### 2026-11-08 — Claude (VS Code)

- Inspected the README, brief, Prisma schema, init migration, `seed.js`, the employer and saved-employer controllers, action-item templates and `EmployersPage.jsx`. Confirmed that the handoff's "employer names unique / one program per employer" note matches the code.
- Researched batch 1 against official provider pages. Applied the user's mid-task scope change (post-separation veteran access; SkillBridge secondary): added `veteranAccess` to every record, moved 6 active-duty-only records to `excluded`, and added 3 veteran-accessible programs (Vets Who Code, NPower Path2Tech Cybersecurity, NPower Networking & Sysadmin).
- Created `research/programs-staging.json`, `research/scripts/validate-staging.mjs`, `research/SCHEMA_PROPOSAL.md` and `research/IMPORT_AND_MAINTENANCE_PLAN.md`. Nothing committed.
- **No database writes, migrations, imports or deployments were performed** on any environment.
- Next step: human review of the SOURCE_VERIFIED records, then a decision on the schema proposal. After that, Marco writes the migration and importer (local Docker DB first).

### 2026-11-08 — Codex

- Created this shared handoff and agent instructions at the user's request.
- Recorded the agreed direction and the research task already sent to Claude; no research completion is implied.
- Added `CLAUDE.md` and `AGENTS.md` so both agents discover this file in future sessions.
- Verification: checked repository status and confirmed no existing agent-instruction or handoff files were present before creation.
- Next step: Claude should record its current research progress, staging-file paths, findings, and decisions needed here. Codex can then review those files directly when the user asks.
