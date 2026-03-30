# nAuth Microservice Scaffold

nAuth is a new authentication-focused microservice inside a broader ecosystem.
This repository currently contains **initial scaffolding only**.

## Root structure
- `frontend/` - React + JavaScript + Tailwind app shell (target deploy: Vercel)
- `backend/` - Node.js + Express service foundation (target deploy: Railway)
- `DB/` - relational schema/docs starter assets (target platform: Supabase PostgreSQL)

## Local development
### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

### Backend
1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env`
4. `npm run dev`

## Environment files
- `frontend/.env.example`
- `backend/.env.example`

These include placeholders for service URLs, database connection values, JWT keys, OAuth providers, and coordinator/directory integration points.

## Deployment preparation docs
- `backend/docs/deployment-preparation.md` - platform mapping, environment setup, and deferred deployment tasks
- `backend/docs/nAuth-technical-spec.md` - backend/auth contract specification for implementation phases

## Intentionally not implemented in this phase
- Auth business logic
- OAuth flows
- JWT issuance/signing
- Refresh token and logout logic
- Real database connectivity/migrations

This phase only establishes clean project structure and deployment-ready foundations.
