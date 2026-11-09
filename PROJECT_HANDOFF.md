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

## Latest implementation state

- **Repo location changed (2026-11-09): `~/projects/VetTool`.** It moved out of iCloud-synced `~/Documents`, where offloaded `node_modules`/`.git` files made Node and Prisma hang. The copy was verified byte-identical (checksum rsync, 359 files) with `git fsck` clean, and dependencies were reinstalled. **The old copy at `~/Documents/InterviewPrep/MainProjects/VetTool` is stale; don't work there.** It's kept until the user confirms deletion. If Node/Prisma hangs again, check `find . -flags +dataless` first.
- **Phase 1 complete, LOCAL ONLY (branch `feature/programs-directory`):**
  - expand migration `20261108230000_programs_directory_expand` (additive), applied to local Docker only;
  - [import-programs.js](backend/prisma/import-programs.js): validator-gated, dry run by default, transition table, 10 passing `node:test` cases (`npm test`);
  - [migrate-legacy-employers.js](backend/prisma/migrate-legacy-employers.js): the backfill;
  - backend `/programs` (PUBLISHED-only browse with techTrack/format/availability filters; DRAFT → 404; ARCHIVED viewable with reason); `/employers` removed; program-based saves and dashboard (DRAFT shows name/org/"Under review" only; ARCHIVED shows reason); format-based action-item templates;
  - minimal frontend switch: browse and dashboard use programs. The route is still `/employers` and browse is still behind login; both change in phase 2.
- **Verified locally (2026-11-09):**
  - 26/26 HTTP smoke checks: public reads, no review-metadata leak, filters, draft 404s, archived detail, save rules (401/404/409/400), and legacy dashboard intact;
  - headless-browser end-to-end 8/8: signup → browse → filter → save → dashboard; legacy user sees 2 archived reasons and 3 "Under review"; no console errors;
  - `vite build` succeeds.
- **Local-only test data:** users `legacy-test@example.com` (5 migrated saves; local password set for testing) plus a few `smoke-*`/`e2e-*@example.com` signups. `vetswhocode-accelerator` was set PUBLISHED via SQL as a stand-in for the unbuilt admin Approve & publish.
- **Not done:** the contract step (drop `Employer`, require `programId`), which comes after production is verified. Production is untouched.
- **Polish note for phase 2:** archive reasons begin with "Archived Nov 2026:", so the dashboard reads "Archived. Archived Nov 2026…". Fix the label or the reason text in the design pass.
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

## Proposed phased implementation plan (Claude; awaiting user approval; nothing started)

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

0. ~~iCloud offloading~~: **resolved (user chose to move the repo, 2026-11-09).** Remaining: the user to reopen VS Code at `~/projects/VetTool` and confirm deletion of the old `~/Documents` copy.

1. ~~Schema approval~~: **approved (user, 2026-11-08).** Phase 1 starting on the local Docker DB only. Production steps (phase 6) still need explicit user go-ahead.
2. ~~When and where to review listings~~: **decided (user, 2026-11-08)**. Records are reviewed in the admin page's "Drafts to review" list:
   - The importer loads SOURCE_VERIFIED records as hidden DRAFTs, including in production. The user accepts unreviewed DRAFT rows there, since the listing count is small.
   - The only action is Approve & publish; corrections still go through staging → validator → import.
   - Build order agreed: the admin page (phase 5) comes before testers are invited (phase 6).
   - This supersedes the earlier "importer imports only APPROVED" rule.
3. **Data review items (carried over):**
   - browser-review the 13 SOURCE_VERIFIED records in the admin page (phase 5/6);
   - Per Scholas split (fetch each course page, batch 2);
   - Oracle OVIP official-page check.

Resolved and removed from this list:
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
