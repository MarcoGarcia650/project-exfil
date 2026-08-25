# Vet Tool — Project Brief for Claude Code

## Project Summary

**Working name:** VetPath (placeholder — rename as desired)

**Problem:** Veterans and transitioning service members lack a clear, personalized action plan for the civilian job search — especially finding employers with real veteran hiring pipelines (not just generic "veteran friendly" marketing claims). Existing resources are scattered across LinkedIn posts, individual company career pages, and word of mouth.

**Solution:** A web app centered on a curated, searchable database of real veteran hiring programs (e.g. Amazon's military pipeline, Oracle's OVIP, Microsoft MSSA, Hiring Our Heroes, VetsinTech), with basic user accounts to save/track target employers and auto-generated next-step action items per saved employer.

**Primary user:** Transitioning or already-separated veterans job searching in tech or adjacent fields.

**Core loop:** User logs in → browses/filters the employer database by field, program type, location → saves employers they're pursuing → tracks status (researching/applied/interviewing/offer/rejected) per saved employer → sees auto-suggested next steps for each.

---

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Frontend:** React (or Next.js if we want SSR/routing conveniences — decide at setup)
- **Auth:** Session-based or JWT — keep simple for v1 (e.g. `bcrypt` + JWT is fine, no need for OAuth/third-party auth in v1)
- **Deployment target:** Vercel (frontend) + Railway or Render (backend/DB), or AWS RDS for the database specifically if we want to bank real AWS hands-on experience (aligns with ongoing AWS CCP study)
- **Language:** JavaScript/Node throughout for consistency with prior mini-projects (event log parser, rate limiter)

---

## Data Model (v1)

```sql
-- Users
User
- id (PK)
- email (unique)
- password_hash
- branch (enum: Army, Navy, Air Force, Marines, Coast Guard, Space Force, Military Spouse)
- target_field (string, e.g. "Software Engineering", "Cybersecurity", "Product Management")
- separation_date (date, nullable — may be pre-separation)
- created_at

-- Employers (the core content — the differentiator)
Employer
- id (PK)
- name (e.g. "Amazon", "Oracle")
- program_name (e.g. "Amazon University Talent Acquisition Military Pipeline", "Oracle Veteran Internship Program (OVIP)")
- program_type (enum: internship_pipeline, direct_hire, apprenticeship, fellowship, other)
- url (link to official program page)
- description (text)
- eligibility_notes (text — e.g. "Transitioning veterans and active-duty military spouses; no enrollment requirement")
- industry_tags (array/join table — e.g. ["tech", "cloud", "software"])
- locations (array — e.g. ["Remote", "Seattle, WA", "Austin, TX"])
- application_window (string, nullable — e.g. "Rolling" or "Typically opens May, cohort starts August")
- created_at, updated_at

-- Saved/tracked employers per user
SavedEmployer
- id (PK)
- user_id (FK -> User)
- employer_id (FK -> Employer)
- status (enum: researching, applied, interviewing, offer, rejected)
- notes (text, nullable)
- saved_at
- updated_at

-- Auto-suggested next steps per saved employer
ActionItem
- id (PK)
- saved_employer_id (FK -> SavedEmployer)
- title (string)
- completed (boolean, default false)
- order (int)
- created_at
```

**Action item generation logic (v1, non-AI):** When a user saves an employer, auto-create 2-3 default action items based on `program_type`. E.g. for `internship_pipeline`: "Research the program's application timeline," "Find a referral or alum from this program," "Tailor resume to program's stated preferences." Simple lookup table by program_type, not dynamic/AI-generated in v1.

---

## V1 Feature Scope

### In scope
1. User signup/login/logout (email + password)
2. Basic user profile (branch, target field, separation date)
3. Employer database — seeded manually with real data (see seed list below)
4. Browse/filter employers by industry tag, program type, location
5. Save an employer to user's tracked list
6. Update status on a saved employer
7. View auto-generated action items per saved employer; mark items complete
8. Simple dashboard: saved employers + overall progress snapshot

### Explicitly out of scope for v1 (future versions)
- AI-powered MOS-to-civilian-job-title translation
- Resume upload/builder
- Community features, forums, mentor matching
- Email notifications/reminders
- Admin panel for managing employer data (seed via script/SQL directly for v1)
- OAuth/social login
- Mobile app (responsive web only)

---

## Seed Data (Real Programs to Include at Launch)

Use these as the initial seeded rows in the Employer table — all real programs already researched:

1. **Amazon** — Amazon University Talent Acquisition (AUTA) Military Pipeline — internship_pipeline — tech/cloud
2. **Oracle** — Oracle Veteran Internship Program (OVIP) — internship_pipeline — tech/cloud — note: 6-month program, no enrollment requirement, cohorts ~2-3x/year
3. **Microsoft** — Microsoft Software & Systems Academy (MSSA) — fellowship — tech
4. **Hiring Our Heroes** — Corporate Fellowship Program — fellowship — general/multi-industry
5. **VetsinTech** — network/resource org — other — tech
6. Add more as researched (Intuit, Visa, Salesforce, Workday veteran programs mentioned in earlier research)

---

## Build Order / Prep Plan for Claude Code

**Step 1 — Project scaffolding**
- Initialize Node/Express backend with clear folder structure (routes, controllers, models, middleware)
- Set up PostgreSQL connection (use `pg` or an ORM like Prisma/Sequelize — Prisma recommended for speed and type safety)
- Set up React/Next frontend scaffold separately or as a monorepo

**Step 2 — Database + models**
- Define schema per data model above (Prisma schema or raw SQL migrations)
- Write seed script with the real employer data listed above

**Step 3 — Auth**
- Signup/login endpoints, password hashing (bcrypt), JWT issuance
- Basic auth middleware to protect routes

**Step 4 — Core API endpoints**
- `GET /employers` (with query params for filtering)
- `POST /saved-employers` (save an employer, auto-generate action items)
- `PATCH /saved-employers/:id` (update status)
- `PATCH /action-items/:id` (mark complete)
- `GET /dashboard` (user's saved employers + progress summary)

**Step 5 — Frontend**
- Signup/login pages
- Employer browse/filter page
- Save employer flow
- Dashboard with saved employers, status, action items

**Step 6 — Deploy**
- Backend + DB to Railway/Render (or AWS RDS for DB)
- Frontend to Vercel
- Clean README with setup instructions, screenshots, live demo link

**Step 7 — Polish**
- Add a few more employers to the seed data
- Clean up UI (doesn't need to be beautiful, needs to be clear and functional)
- Write a solid README that explains the problem, the solution, and the tech decisions

---

## Notes for Claude Code

- Marco is a USMC veteran and CS student (graduating Dec 2026).
- He's built two backend mini-projects already this summer (event log parser, rate limiter) in Node/Express — comfortable with basic Node patterns but still building fluency. Prefers to write code himself with guidance rather than have full solutions generated — use a teaching approach: explain concepts, give structure/scaffolding, let him implement core logic, debug alongside him rather than just fixing things outright.
- Keep the codebase clean and well-commented — it should be easy to read and explain, not just functional.
- Prioritize shipping a working v1 over feature completeness. A deployed, functional MVP with the core loop working beats a half-built feature-rich version.
