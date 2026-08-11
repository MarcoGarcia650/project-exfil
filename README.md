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
| Data access | Prisma | Started with raw SQL for the interview-signal value, but once the deploy target grew to real AWS infra (RDS, Elastic Beanstalk, S3/CloudFront) for an AWS-apprenticeship-focused job search, that infra work became the more distinctive story to tell in interviews — Prisma buys back the time/complexity budget that raw SQL would've spent on backend plumbing. |
| Database | PostgreSQL on RDS | Free-tier eligible, and genuine hands-on RDS experience (security groups, subnet groups, managed credentials) directly relevant to an AWS-focused job search. |
| Frontend | React (Vite), not Next.js | The app is a logged-in dashboard, not content that benefits from SSR/SEO. Plain React keeps the client/API boundary legible, rather than stacking a second framework's conventions on top of Express fundamentals still being built. |
| Backend hosting | Elastic Beanstalk, **single-instance mode** | EB's *default* environment type provisions a load balancer — which is not covered by the AWS free tier and runs ~$16+/mo sitting idle. Single-instance mode skips the ALB entirely while still giving real EB deployment/config experience. |
| Frontend hosting | S3 + CloudFront | Static hosting behind a CDN, effectively free at this scale. |
| API HTTPS | A **second** CloudFront distribution in front of the EB backend | Single-instance EB has no load balancer, and therefore no built-in TLS termination — it only serves HTTP. Once the frontend is served over HTTPS via CloudFront, browsers block API calls to a plain-HTTP backend as mixed content. Fronting EB with its own CloudFront distribution gives it HTTPS for free, without paying for a load balancer just to get a certificate. |

## Data model

Four tables: `User`, `Employer` (the curated program data), `SavedEmployer` (join table with a
`status` field and a `@@unique(userId, employerId)` constraint — one tracked relationship per employer
per user, not multiple parallel attempts), and `ActionItem` (the per-employer checklist, seeded via a
Prisma nested write when a `SavedEmployer` is created). Action items are generated from a static lookup
table keyed by `programType` — deliberately non-AI for v1, per the brief's "prioritize shipping a
working v1 over feature completeness."

## Structure

- `backend/` — Express API, Prisma + PostgreSQL
- `frontend/` — React (Vite)

## Local development

```bash
# Postgres, if not already running
docker start vetpath-db   # or: docker run -d --name vetpath-db -e POSTGRES_USER=vetpath -e POSTGRES_PASSWORD=vetpath_dev -e POSTGRES_DB=vetpath -p 5432:5432 postgres:16

# backend
cd backend
cp .env.example .env   # fill in DATABASE_URL
npm run dev             # http://localhost:4000

# frontend
cd frontend
cp .env.example .env
npm run dev             # http://localhost:5173
```

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
