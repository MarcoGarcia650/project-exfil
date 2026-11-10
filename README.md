# Project Exfil

**Live demo:** https://projectexfilout.org

## The problem

Veterans and transitioning service members lack a clear, personalized action plan for the civilian job
search — especially finding employers with *real* veteran hiring pipelines, not just generic "veteran
friendly" marketing claims. The information that does exist is scattered across LinkedIn posts,
individual company career pages, and word of mouth, so a transitioning veteran has to piece together
which programs are actually real, who's eligible, and what the next step is.

## The solution

Project Exfil is a curated database of real veteran hiring programs — Amazon's military pipeline,
Oracle's OVIP, Microsoft's MSSA, Hiring Our Heroes' Corporate Fellowship, and more — with accounts to
save and track target employers, plus an auto-generated starting checklist for each one based on the
program type.

**The core loop:** browse/filter the employer database → save employers you're pursuing → track status
per employer (researching → applied → interviewing → offer/rejected) → work through the auto-suggested
next steps for each.

## Tech stack, and why

| Layer | Choice | Why |
|---|---|---|
| Backend | Node/Express | Consistency with prior mini-projects; comfortable baseline to build fluency on. |
| Data access | Prisma | Started with raw SQL to build that fluency directly, but once the deploy target grew to real AWS infra (RDS, Elastic Beanstalk, S3/CloudFront), that infrastructure work became the more interesting problem to spend time on — Prisma buys back the time/complexity budget that raw SQL would've spent on backend plumbing. |
| Database | PostgreSQL on RDS | Free-tier eligible, and genuine hands-on experience with a managed production database (security groups, subnet groups, managed credentials) rather than a local-only setup. |
| Frontend | React (Vite), not Next.js | The app is a logged-in dashboard, not content that benefits from SSR/SEO. Plain React keeps the client/API boundary legible, rather than stacking a second framework's conventions on top of Express fundamentals still being built. |
| Backend hosting | Elastic Beanstalk, **single-instance mode** | EB's *default* environment type provisions a load balancer — which is not covered by the AWS free tier and runs ~$16+/mo sitting idle. Single-instance mode skips the ALB entirely while still giving real EB deployment/config experience. |
| Frontend hosting | S3 + CloudFront | Static hosting behind a CDN, effectively free at this scale. |
| API HTTPS | A **second** CloudFront distribution in front of the EB backend | Single-instance EB has no load balancer, and therefore no built-in TLS termination — it only serves HTTP. Once the frontend is served over HTTPS via CloudFront, browsers block API calls to a plain-HTTP backend as mixed content. Fronting EB with its own CloudFront distribution gives it HTTPS for free, without paying for a load balancer just to get a certificate. |

## Data model

- `Organization` → `Program`: one organization can run several programs, and each program is its own listing with a stable slug (`/programs/:slug`).
- `Program.publishStatus`: `DRAFT` (imported, awaiting admin review), `PUBLISHED`, `ARCHIVED` (public at its URL with a reason, hidden from browse), `REJECTED` (failed review, never public). Only `PUBLISHED`/`ARCHIVED` are ever served publicly.
- Listing content only enters the database through the importer (`research/programs-staging.json` → validator → `import-programs.js`), and only an admin's Approve & publish makes it public.
- `SavedEmployer` + `ActionItem`: a user's tracked program, status and checklist.
- `Comment` (threaded), `Report`, `Submission`: public discussion with reactive moderation, plus user suggestions reviewed by the admin.

## Structure

- `backend/` — Express API, Prisma + PostgreSQL
- `frontend/` — React (Vite)

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

The integration suites reset `exfil_test` to a small fixture set each run (`backend/test/integration/fixtures.js`), so they never touch your dev data. They refuse any database not named `*_test`.

## Deployment

Deployed on AWS: S3 + CloudFront (frontend), Elastic Beanstalk single-instance (backend), RDS Postgres
(database). See the table above for the reasoning behind each piece.

## What's not in v1

AI-powered resume/MOS translation, resume upload, community features, email notifications, an admin
panel for managing employer data (seeded via script), OAuth, and a mobile app are all explicitly out of
scope for v1 — see [vet_tool_project_brief.md](./vet_tool_project_brief.md) for the full original brief.
Growing the employer database beyond the initial seed set is planned for v2, likely via scraping
existing structured directories (e.g. the DoD SkillBridge program directory) rather than open-ended web
scraping, with a human review step before anything goes live — the app's whole value is trustworthy
curation, so unreviewed scraped data would undermine the actual differentiator.
