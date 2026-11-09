# Schema proposal: organizations, programs, community

Status: **proposal, awaiting user approval.** No migration has been written or run. Based on the repo as of 2026-11-08: `backend/prisma/schema.prisma` and the init migration, the controllers under `backend/src/controllers/`, and `frontend/src/App.jsx`. Reconciled with every decision recorded in `PROJECT_HANDOFF.md` through 2026-11-08. If this doc and the handoff disagree, the handoff wins.

**In this version:** the directory (organizations → programs), shareable program pages, application availability, submissions, threaded discussion, usernames, and moderation with a minimal admin page.
**Deferred to a later version:** DMs and notifications (which ship together), direct listing editing in the admin page, username changes, edit windows, new-account limits, and auto-hide.

## What the current schema can't represent

| Current schema | Problem |
| --- | --- |
| `Employer.name @unique`, with one `programName` per row | One organization runs several programs. Amazon has 4 listings in batch 1 and NPower has 3. |
| `programType` enum without a training value | Most of batch 1 is training. MSSA is mis-seeded as `FELLOWSHIP`, Amazon's careers hub as `INTERNSHIP_PIPELINE`, and VetsinTech (an organization) as `OTHER`. |
| `industryTags String[]` (free text) | No controlled tech-track list. |
| `applicationWindow String?` only | There's no structured way to say whether a program is accepting applications, and it gets confused with whether the listing is published or archived. |
| No `verifiedOn` field | Listings must show it (user decision), and reverification needs it. |
| Required strings everywhere | There's no honest way to say "unknown". |
| `User` has only `email` as an identity | There's no public-safe identifier for comment authors, and no role or suspension field. |

## Directory models

```prisma
model Organization {
  id         String    @id @default(cuid())
  slug       String    @unique          // "amazon" — stable URL + import key
  name       String
  websiteUrl String?
  programs   Program[]
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}

enum ProgramFormat {
  TRAINING
  CERTIFICATION_TRAINING
  FELLOWSHIP
  INTERNSHIP
  APPRENTICESHIP
  DIRECT_HIRE
}

enum TechTrack { SOFTWARE_DEV IT_SUPPORT CLOUD CYBERSECURITY DATA }

// Is the LISTING shown in the directory? (our decision)
enum PublishStatus { DRAFT PUBLISHED ARCHIVED }

// Can someone APPLY right now? (the provider's state, as of verifiedOn)
enum ApplicationAvailability { ACCEPTING ROLLING CLOSED UNKNOWN }

model Program {
  id                      String                  @id @default(cuid())
  slug                    String                  @unique   // = staging id; URL is /programs/:slug
  organizationId          String
  organization            Organization            @relation(fields: [organizationId], references: [id])
  name                    String
  description             String
  format                  ProgramFormat
  techTracks              TechTrack[]
  veteranAccessRoute      String                  // display text; NOT proof of verification (see below)
  eligibilityNotes        String?                 // null = unknown → UI shows "Not stated by provider"
  prerequisites           String?
  remoteAvailability      String?                 // "remote" | "in_person" | "hybrid" | "varies"
  locations               String[]
  cost                    String?
  duration                String?
  applicationAvailability ApplicationAvailability @default(UNKNOWN)
  applicationTiming       String?                 // e.g. "Applications open Nov 16–30, 2026"
  applicationUrl          String?
  officialSourceUrl       String
  skillbridgeNote         String?                 // optional side note; no filter
  verifiedOn              DateTime                // shown on the listing; set by the importer
  publishStatus           PublishStatus           @default(DRAFT)   // DRAFT = imported, awaiting review in admin page
  reviewedById            String?                 // admin who approved & published
  reviewedAt              DateTime?
  reviewedContentHash     String?                 // contentHash at approval — review metadata describes what was reviewed
  contentHash             String                  // set by importer; a change on a PUBLISHED row sends it back to DRAFT
  archivedAt              DateTime?
  archiveReason           String?                 // shown to everyone, including users who saved it; required when ARCHIVED
  savedBy                 SavedEmployer[]         // renamed later — see migration
  comments                Comment[]
  submissions             Submission[]
  createdAt               DateTime                @default(now())
  updatedAt               DateTime                @updatedAt

  @@unique([organizationId, name])
}
```

### Two independent statuses

`publishStatus` and `applicationAvailability` are separate on purpose. An archived listing might once have been ACCEPTING, and a published listing is often CLOSED between cohorts. The UI shows both: an "Archived" banner with its reason, plus an availability badge.

The staging file currently uses 6 status values. The importer maps them as follows:

| Staging value | Imported as | Note |
| --- | --- | --- |
| `OPEN` | `ACCEPTING` | |
| `OPEN_ROLLING` | `ROLLING` | |
| `CLOSED` | `CLOSED` | |
| `UPCOMING` | `CLOSED` | Keep the opening date in `applicationTiming` |
| `NO_COHORTS_SCHEDULED` | `CLOSED` | |
| `UNKNOWN` | `UNKNOWN` | |

The staging file and validator get updated to the 4 values in phase 1.

### What actually guarantees a listing is verified

Correction to an earlier draft: a required `veteranAccessRoute` column guarantees only that some text exists. It does **not** prove that a veteran route was verified. Publication is guaranteed by the review gate, not by the column:

1. The validator requires `SOURCE_VERIFIED` records to have `verifiedOn`, official evidence, and `veteranAccess.status = VERIFIED` with a source URL.
2. The importer is the **only** way listing *content* gets written. It refuses to run if the validator fails, imports only `SOURCE_VERIFIED` records, sets `verifiedOn`, and creates them as `DRAFT`, which is hidden from users.
3. A human reviewer opens each draft in the admin page and clicks **Approve & publish**, which sets `PUBLISHED`, `reviewedById` and `reviewedAt`. Decided by the user on 2026-11-08; unreviewed DRAFT rows in production are acceptable to them.
4. The admin page can only change a listing's *status*, never its fields, so content can't bypass steps 1–2.
5. Any content change to a PUBLISHED listing sends it back to DRAFT for re-review (user decision 2026-11-08, option (a); transition table in the plan doc). A PUBLISHED row therefore always has `reviewedContentHash = contentHash`.
6. **Every public endpoint excludes DRAFT rows and their content:** search/browse, `/programs/:slug`, organization pages and comment threads. ARCHIVED rows are viewable at their URL but excluded from browse. The one exception is a user's own dashboard, where their saved DRAFT shows as "Under review" (name, organization and status only).

The database can't enforce this on its own. Keeping the importer as the single write path is what makes it hold.

### Archiving

- Archived listings stay readable at their URL and on the dashboards of users who saved them, with `archiveReason` shown.
- They're hidden from browse/search results.
- Their discussion threads stay open for **new comments**.
- Archive is set only through staging + import, like any other listing change.

## Accounts: usernames, roles, suspension

```prisma
enum Role { USER ADMIN }

// Additions to User
//   username       String?   // as the user typed it; shown publicly
//   usernameKey    String?   @unique  // lowercase(username) — enforces case-insensitive uniqueness
//   role           Role      @default(USER)
//   suspendedAt    DateTime?  // non-null = read-only account
//   tokenVersion   Int       @default(0)  // bump on password reset to invalidate old JWTs
//   comments       Comment[]
//   reports        Report[]
//   submissions    Submission[]
```

Proposed username rules:
- **Unique, ignoring capitals.** Stored as typed, and enforced through `usernameKey` = lowercase. "Marco" blocks "marco".
- **Characters:** 3–20, letters, digits and underscore, starting with a letter. That means no spaces, no look-alike Unicode characters, and no email-shaped names.
- **Reserved names** (checked against the lowercase key): `admin`, `administrator`, `mod`, `moderator`, `staff`, `support`, `help`, `official`, `system`, `root`, `exfil`, `projectexfil`, `deleted`, `removed`, `null`, `undefined`.
- **New accounts** choose a username at signup.
- **Existing accounts:** `username` stays null until the user picks one. It's required before **public participation**, meaning posting a comment. Saving and tracking stay private and need no username. Reports and submissions are private to the admin, so they don't need one either.
- **Username changes are deferred.** Once set, a username is fixed in this version.
- The email is never shown publicly. Comment author labels use `username` only.

### Password reset (user, 2026-11-08: admin-link fallback now, email later)

Reset emails via SES are on hold while the user scopes costs. They move to the later version alongside DMs and notifications. For this version, the admin generates reset links:

```prisma
model PasswordResetToken {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  tokenHash   String    @unique   // store only a hash; the raw token appears once, in the link
  expiresAt   DateTime            // proposal: 24h for admin-issued links
  usedAt      DateTime?           // single use
  createdById String?             // admin who issued it (null later, for self-serve email resets)
  createdAt   DateTime  @default(now())
}
```

- **Now:** on the admin page, user lookup → "Generate reset link". The link (`/reset-password?token=…`) is shown once, and you send it to the tester yourself. **Only send it through a channel you've confirmed belongs to the account owner,** e.g. a reply to a message from the email on the account. Never send it to whoever happens to ask. Completing the reset sets a new `passwordHash`, bumps `tokenVersion` (logging out old sessions) and marks the token used.
- **Later (with DMs and notifications):** add a public "Forgot password?" endpoint that creates the same token and emails the link via SES. The response is the same whether or not the account exists, and the endpoint is rate-limited. The table, the reset page and the confirm endpoint don't change, so the only prep needed now is building delivery as a separate step from token creation.

Related account fixes (no schema change):
- normalize email to lowercase on signup and login, after first checking existing rows for case-only duplicates;
- validate signup input;
- set a minimum password length.

## Community models

Rules these models enforce (user decisions, 2026-11-08):
- Anyone can read. An account is needed to save, comment, report or submit.
- Submissions never change a listing. The admin verifies them and updates the listing through staging + import.
- Comments are not pre-moderated. Moderation is reactive: report → the admin hides the comment and/or suspends the account.
- Every comment shows its own posted timestamp. There is no derived "last discussed" label.

```prisma
model Comment {
  id           String    @id @default(cuid())
  programId    String
  program      Program   @relation(fields: [programId], references: [id])
  authorId     String
  author       User      @relation(fields: [authorId], references: [id])

  // Threading: a proper self-relation.
  parentId     String?
  parent       Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies      Comment[] @relation("CommentReplies")

  body         String              // max length enforced in code (see limits)
  createdAt    DateTime  @default(now())  // shown on every comment; stored UTC, rendered in viewer's timezone
  hiddenAt     DateTime?           // UI shows "removed by admin" and keeps the thread shape
  hiddenReason String?             // admin-only
  reports      Report[]

  @@index([programId, parentId, createdAt, id])  // page top-level comments, then replies, in time order
}

enum ReportStatus { OPEN ACTIONED DISMISSED }

model Report {
  id         String       @id @default(cuid())
  commentId  String
  comment    Comment      @relation(fields: [commentId], references: [id])
  reporterId String
  reporter   User         @relation(fields: [reporterId], references: [id])
  reason     String
  status     ReportStatus @default(OPEN)
  createdAt  DateTime     @default(now())
  resolvedAt DateTime?

  @@unique([commentId, reporterId])   // one report per user per comment
}

enum SubmissionKind   { LISTING_UPDATE NEW_LISTING_LEAD }
enum SubmissionStatus { PENDING ACCEPTED REJECTED }

model Submission {
  id          String           @id @default(cuid())
  kind        SubmissionKind
  programId   String?          // required for LISTING_UPDATE, null for a lead (enforced in code)
  program     Program?         @relation(fields: [programId], references: [id])
  submitterId String
  submitter   User             @relation(fields: [submitterId], references: [id])
  body        String
  sourceUrl   String?          // a lead, not evidence — the admin still checks the official page
  status      SubmissionStatus @default(PENDING)
  adminNote   String?          // shown to the submitter on their own submissions list
  createdAt   DateTime         @default(now())
  reviewedAt  DateTime?
}
```

Validation the database can't express. This lives in the comment controller:
- **Same-program replies:** if `parentId` is set, load the parent and reject with 400 unless `parent.programId === programId`.
- **Parent must exist.**
- **Hidden comments, Reddit-style (user, 2026-11-08):** a hidden comment stays in place as a "Removed by admin" placeholder, without its body or author. Its existing replies remain visible underneath. New replies to a hidden comment are **blocked** (user, 2026-11-08).
- **Reply depth (user, 2026-11-08):** unlimited depth is stored, but the UI indents at most 3 levels, then shows "continue thread", which links to a view rooted at that comment.
- **Account checks:** the author must have a `username` and `suspendedAt` must be null.

Limits, as defaults to tune:

| Item | Proposed |
| --- | --- |
| Comment body | 1–2,000 characters |
| Submission body | 1–5,000 characters |
| Report reason | 1–500 characters |
| Comment pagination | 20 top-level comments per page, cursor on `(createdAt, id)`; replies loaded per thread, 20 at a time |
| Comment posting | Max 5 per user per 10 minutes. Checked by counting the user's recent rows in Postgres, so it survives restarts with no Redis. |
| Submissions | Max 10 per user per day (same DB-count approach) |
| Reports | Max 30 per user per day |
| Login / password reset | Per-IP and per-email limits with `express-rate-limit`. Its in-memory store is fine on single-instance Elastic Beanstalk. The proxy configuration must match the real path (viewer → CloudFront → EB's nginx → Express). Don't use blanket `trust proxy = true`, which lets clients spoof `X-Forwarded-For` and dodge limits. Either set a hop count matching the verified chain, or key on CloudFront's `CloudFront-Viewer-Address` header, with CloudFront configured to forward it. Verify which is right in phase 3 by logging the headers on the real deployment. |

Suspension and roles must take effect immediately. JWTs last 7 days, so a role or suspension claim baked into the token would go stale. Instead, `requireAuth` loads the user row once per request and checks `suspendedAt` (on write routes) and `tokenVersion`. A new `requireAdmin` middleware checks `role` from that same row. The first admin is set by a one-off SQL/script; there is no UI to grant admin.

User-generated content and XSS: comments are rendered as plain text. React escapes it by default, so never use `dangerouslySetInnerHTML` and don't render Markdown/HTML in this version. This matters more because the JWT lives in `localStorage`.

### Minimal admin page (in scope)

Three lists, restricted to `role = ADMIN`:
1. **Open reports:** hide the comment (with reason), suspend the author, or dismiss.
2. **Pending submissions:** accept or reject, with a note. Accepting only changes status; the listing change still goes through staging + import.
3. **User lookup by username or email:** email lookup is admin-only and never displayed publicly; it's needed because existing users may have no username yet. Actions: suspend or unsuspend, or generate a password-reset link.
4. **Drafts to review:** each imported DRAFT with its fields, official source link and review checklist. The only action is **Approve & publish**.

Direct listing *editing* (changing fields) is **deferred**; status-only actions (approve & publish) are in scope.

## Migration approach that preserves saved data

The `SavedEmployer` and `ActionItem` rows on RDS belong to real users. Use expand → backfill → switch → contract, with each step as its own migration and deploy. Take an RDS snapshot before each production step.

1. **Expand.** Add `Organization`, `Program`, the community tables, and the new `User` columns. Add a nullable `programId` on `SavedEmployer`. Nothing reads them yet.
2. **Backfill** with a script, run on local Docker first:
   - Import SOURCE_VERIFIED programs as DRAFT.
   - Map each existing `Employer` row to a program. The Amazon careers hub's saves move to `amazon-technical-apprenticeship`. HOH CFP and the VetsinTech organization row become ARCHIVED programs, using the reason text in `programs-staging.json` → `existingSeedRecheck`.
   - Set `SavedEmployer.programId`.
   - Legacy rows archived this way get `verifiedOn = 2026-08-09`, the date in the `seed.js` comment, because `verifiedOn` is required.
3. **Switch.** Point the controllers and frontend at `Program`. Add `actionItemTemplates` entries for `TRAINING`, `CERTIFICATION_TRAINING` and `INTERNSHIP`. Existing action items are stored rows and don't change.
4. **Contract**, after verifying production. Make `programId` required, then drop `employerId` and `Employer`. Optionally rename `SavedEmployer` → `SavedProgram` using `@@map`.

## Remaining decisions

See `PROJECT_HANDOFF.md` → open questions. Decided 2026-11-08:
- reset via admin-issued links (SES later);
- 3-level indentation cap;
- hidden comments shown as a placeholder with their replies visible;
- generic link previews;
- the proposed limits.

Also decided: top-level comments oldest-first; no new replies to hidden comments; testers request resets by contacting the admin directly (no public endpoint). No design questions remain open for this version.
