# Project Exfil

**Live demo:** https://projectexfilout.org

## The problem

Plenty of employers say they're "veteran friendly", but following those links often leads nowhere useful:
outdated programs, generic career pages, unclear eligibility, or initiatives that quietly ended. A veteran
trying to move into tech has to piece together which programs are real, who can actually apply after
separating, and what to do next, from scattered company pages, nonprofit sites, posts and word of mouth.

## The solution

Project Exfil is a curated directory of **tech career programs open to veterans after separation** in
software development, IT and support, cloud, cybersecurity, and data: training programs, certifications,
fellowships, internships, apprenticeships, and direct-hire roles, including individual job openings that
explicitly value military experience.

Every listing is checked against the provider's own official page, shows when it was last verified, and
explains **how a veteran who has already separated can get in**. Programs open only to active-duty members
(such as SkillBridge-only fellowships) aren't listed. Nothing goes public until an admin reviews it.

**The core loop:** search and filter the directory → open a listing → save the ones you're pursuing → track
your status and work through a starting checklist on your dashboard → share experiences and questions in
each listing's and organization's discussion.

## Features

- **Public directory:** keyword search, multi-select filters (tech track, format, application status) kept
  in the URL so any view can be shared, a card grid with a details modal, and a shareable page per listing
  and per organization. Archived listings stay readable with the reason they were archived.
- **Accounts:** usernames (the only public identity; emails are never shown), save/unsave, a dashboard with
  per-program status and checklists, light and dark themes.
- **Community:** threaded, plain-text discussions on every listing and organization page; reporting;
  suggestions for new programs or corrections, which an admin verifies before anything changes.
- **Contact:** signed-in users can message the admin and read replies on "My messages".
- **Admin page:** a report queue (hide comments, suspend accounts), suggestion review with notes back to the
  submitter, user lookup with one-time password-reset links, a contact inbox, and listing management: add a
  listing, edit any listing, and a **Drafts to review** queue where each draft must pass a checklist before
  **Approve & publish** (or is rejected with a private reason).
- **Trust safeguards:** server-side validation, rate limits on login and posting, sessions that end on
  password reset, admin roles checked on every request, and listings that are only ever public when
  published or archived.

## Tech stack, and why

| Layer | Choice | Why |
|---|---|---|
| Backend | Node/Express | Consistency with prior mini-projects; comfortable baseline to build fluency on. |
| Data access | Prisma | Started with raw SQL to build that fluency directly, but once the deploy target grew to real AWS infra (RDS, Elastic Beanstalk, S3/CloudFront), that infrastructure work became the more interesting problem to spend time on — Prisma buys back the time/complexity budget that raw SQL would've spent on backend plumbing. |
| Database | PostgreSQL on RDS | Free-tier eligible, and genuine hands-on experience with a managed production database (security groups, subnet groups, managed credentials) rather than a local-only setup. |
| Frontend | React (Vite), not Next.js | Plain React keeps the client/API boundary legible. The trade-off: the public directory is client-rendered, so link previews are generic and search engines see less than a server-rendered site would show. |
| Backend hosting | Elastic Beanstalk, **single-instance mode** | EB's *default* environment type provisions a load balancer — which is not covered by the AWS free tier and runs ~$16+/mo sitting idle. Single-instance mode skips the ALB entirely while still giving real EB deployment/config experience. |
| Frontend hosting | S3 + CloudFront | Static hosting behind a CDN, effectively free at this scale. |
| API HTTPS | A **second** CloudFront distribution in front of the EB backend | Single-instance EB has no load balancer, and therefore no built-in TLS termination — it only serves HTTP. Once the frontend is served over HTTPS via CloudFront, browsers block API calls to a plain-HTTP backend as mixed content. Fronting EB with its own CloudFront distribution gives it HTTPS for free, without paying for a load balancer just to get a certificate. |

## Data model

- `Organization` → `Program`: one organization can run several programs, and each program is its own listing
  with a stable slug (`/programs/:slug`).
- `Program.publishStatus`: `DRAFT` (awaiting admin review), `PUBLISHED`, `ARCHIVED` (public at its URL with a
  reason, hidden from browse), `REJECTED` (failed review, never public). Only `PUBLISHED`/`ARCHIVED` are ever
  served publicly; application availability (accepting, rolling, closed, unknown) is tracked separately.
- Listing content arrives two ways: the research pipeline (`research/programs-staging.json` → validator →
  `import-programs.js`, which creates drafts) and the admin page's add/edit form. A content fingerprint ties
  each approval to exactly what was reviewed, and the importer never overwrites a listing an admin edited in
  the app.
- `SavedEmployer` + `ActionItem`: a user's saved program, status and checklist.
- `Comment` (threaded; belongs to exactly one listing or organization), `Report`, `Submission`, and
  `ContactMessage`: community discussion with reactive moderation, user suggestions, and messages to the admin.

## Structure

- `backend/`: Express API, Prisma + PostgreSQL, migrations, importer and admin scripts, unit and HTTP
  integration tests
- `frontend/`: React (Vite)
- `e2e/`: Playwright browser tests
- `research/`: the verified program data (`programs-staging.json`), its validator, and research notes
- `infra/`: one-time AWS/GitHub setup for the deploy pipeline
- `.github/`: CI/CD workflow and its helper scripts

## Local development

Everything runs on your machine against a local Postgres in Docker; nothing touches the live site.

**First time**

```bash
# Postgres (Docker)
docker run -d --name vetpath-db -e POSTGRES_USER=vetpath -e POSTGRES_PASSWORD=vetpath_dev \
  -e POSTGRES_DB=vetpath -p 5432:5432 postgres:16
docker exec vetpath-db psql -U vetpath -c "CREATE DATABASE exfil_test"   # for integration tests

cd backend  && npm ci && cp .env.example .env   # set DATABASE_URL to the local database
cd frontend && npm ci && cp .env.example .env   # VITE_API_URL=http://localhost:4000
```

**Every day**

```bash
docker start vetpath-db
cd backend  && npm run dev      # API on http://localhost:4000, restarts on save
cd frontend && npm run dev      # app on http://localhost:5173, live reload
```

**Fresh, realistic data**: `cd backend && npm run db:reset` wipes the *local* database, applies all migrations, imports the verified programs, publishes them locally, and creates two accounts:

| Account | Password | Role |
| --- | --- | --- |
| `admin@example.com` | `local-admin-1` | admin (see `/admin`) |
| `user@example.com` | `local-user-1` | regular user |

It refuses to run unless `DATABASE_URL` points at localhost.

**Tests**

```bash
cd backend
npm test                    # unit tests (importer rules, validation)
npm run test:integration    # HTTP suites against a separate exfil_test database

cd ../e2e && npm ci
npm test                    # browser tests (Playwright; uses your installed Chrome locally)
```

The browser tests start their own API (port 4100, `exfil_test`) and frontend (port 5174), so they can run while your dev servers are up. On failure, `npm run report` opens a trace of each step.

**CI**: `.github/workflows/ci.yml` runs all of the above on every push and pull request (backend unit + integration tests, schema validation, a migrations-vs-schema drift check, staging-data validation, frontend lint and build, and the browser tests), each against a throwaway Postgres. Nothing in CI touches AWS.

The integration suites reset `exfil_test` to a small fixture set each run (`backend/test/integration/fixtures.js`), so they never touch your dev data. They refuse any database not named `*_test`.

## Deployment

Deployed on AWS: S3 + CloudFront (frontend), Elastic Beanstalk single-instance (backend), RDS Postgres
(database). See the table above for the reasoning behind each piece.

**Pipeline** (`.github/workflows/ci.yml`): every push to `main` runs all checks; if they pass, a
**Release plan** job summarizes the commits and flags any database migrations, and the **Deploy** job
waits for approval on the GitHub `production` environment. After approval it:

1. builds the backend bundle on Linux with production dependencies pre-installed (the server never runs `npm install`);
2. deploys it to Elastic Beanstalk with an **Immutable** policy (a fresh instance is health-checked before it replaces the old one);
3. smoke-tests the API, rolling back to the previous version automatically if that fails;
4. builds and syncs the frontend to S3 (hashed assets cached for a year, `index.html` always revalidated) and invalidates CloudFront;
5. smoke-tests the live site.

AWS access uses GitHub OIDC (no stored keys), via a role that only this repo's `production` environment
can assume (`infra/github-deploy/`). Database migrations are **not** run by the pipeline: RDS only accepts
the admin's IP, so additive migrations are applied before approving a deploy, and destructive ones after
the code that no longer needs the old columns is live.

## Roadmap

Not built yet, roughly in order:

- **More verified listings**, added in reviewed research batches (several programs are already queued).
- **Direct messages and notifications**, shipping together, including password-reset and reply emails.
- **Clearer categories** for infrastructure and data-center roles, and for individual job openings versus
  programs.

See [vet_tool_project_brief.md](./vet_tool_project_brief.md) for the original v1 brief.
