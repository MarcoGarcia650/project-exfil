# VetPath

A web app helping transitioning veterans find real veteran-hiring pipelines (e.g. Amazon's military talent pipeline, Oracle OVIP, Microsoft MSSA), save/track target employers, and get auto-generated next-step action items.

See [vet_tool_project_brief.md](./vet_tool_project_brief.md) for the full project brief.

## Structure

- `backend/` — Express API, Prisma + PostgreSQL
- `frontend/` — React (Vite)

## Local development

```bash
# backend
cd backend
cp .env.example .env   # fill in DATABASE_URL
npm run dev             # http://localhost:4000

# frontend
cd frontend
cp .env.example .env
npm run dev             # http://localhost:5173
```

## Stack

- Backend: Node/Express, PostgreSQL via Prisma
- Frontend: React (Vite)
- Deploy target: S3 + CloudFront (frontend), Elastic Beanstalk single-instance (backend), RDS (database)
