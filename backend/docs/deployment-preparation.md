# nAuth Deployment Preparation Guide

## Purpose

This document prepares the `nAuth` repository for future deployment without performing any real deployment in this phase.

Targets:
- Frontend: Vercel
- Backend: Railway
- Database: Supabase PostgreSQL

## Intended Deployment Architecture

- `frontend/` is deployed as a standalone web app on Vercel.
- `backend/` is deployed as a standalone Node.js service on Railway.
- `DB/` remains a local documentation/schema source of truth; runtime database is Supabase PostgreSQL.
- Frontend communicates with backend through public backend URL.
- Backend communicates with Supabase PostgreSQL using environment-configured connection strings.

## Folder-to-Platform Mapping

- Vercel project root: `frontend/`
- Railway service root: `backend/`
- Supabase project: external managed PostgreSQL instance referenced by backend env vars

## Environment Variables by Platform

### Frontend (Vercel, `frontend/.env.example`)
- `VITE_APP_ENV`: frontend runtime profile label (`local`, `development`, `production`)
- `VITE_FRONTEND_BASE_URL`: canonical frontend base URL
- `VITE_BACKEND_BASE_URL`: public backend base URL frontend calls

Notes:
- Only `VITE_` prefixed values are exposed to client bundles.
- Never place secrets in frontend env variables.

### Backend (Railway, `backend/.env.example`)
- Runtime/base URLs:
  - `NODE_ENV`
  - `PORT`
  - `BACKEND_BASE_URL`
  - `FRONTEND_BASE_URL`
- Database:
  - `DATABASE_URL`
  - `SUPABASE_DATABASE_URL`
- JWT/key placeholders (design not implemented yet):
  - `JWT_PUBLIC_KEY`
  - `JWT_PRIVATE_KEY`
  - `JWT_ISSUER`
  - `JWT_AUDIENCE`
- OAuth placeholders (implementation deferred):
  - `OAUTH_GOOGLE_CLIENT_ID`
  - `OAUTH_GOOGLE_CLIENT_SECRET`
  - `OAUTH_GITHUB_CLIENT_ID`
  - `OAUTH_GITHUB_CLIENT_SECRET`
- Ecosystem integration placeholders:
  - `COORDINATOR_BASE_URL`
  - `DIRECTORY_SERVICE_URL`
- Cookie/CORS preparation placeholders:
  - `COOKIE_DOMAIN`
  - `COOKIE_SECURE`
  - `COOKIE_SAME_SITE`
  - `CORS_ALLOWED_ORIGINS`

Notes:
- Backend secrets must be managed in Railway environment settings (not committed to repo).
- JWT, OAuth, cookie, and CORS values are placeholders only in this phase.

## Local vs Development vs Production Configuration Concept

- `local`:
  - frontend runs at localhost (Vite dev server)
  - backend runs at localhost
  - cookie/CORS can be permissive for local testing only
- `development` (cloud dev/staging):
  - frontend and backend deployed separately with HTTPS URLs
  - CORS origin allowlist should be explicit
  - cookie security attributes should be near-production
- `production`:
  - strict allowlist and secure cookie settings required
  - only managed secrets in platform settings
  - no secret material in repository

## Frontend URL and Backend URL Relationship

- Frontend must call backend using `VITE_BACKEND_BASE_URL`.
- Backend should treat `FRONTEND_BASE_URL` as trusted origin input for future CORS/callback validation.
- When deployed, URLs must be updated to real platform domains and kept environment-specific.

## Backend to Database Connection Model

- Backend reads database connection from environment (`DATABASE_URL` and/or `SUPABASE_DATABASE_URL`).
- Supabase PostgreSQL connection details are provided outside Git (Railway env settings).
- Actual connection pooling, migration execution, and DB initialization are deferred to future implementation.

## Future Secure Cookie Requirements (Documented, Not Implemented Here)

- Refresh token must be sent/stored via HTTPOnly cookie only.
- Production cookie policy should include:
  - `Secure=true`
  - appropriate `SameSite` policy (to be finalized based on callback/cross-site requirements)
  - explicit domain/path scope
- Cookie decisions must align with frontend and backend deployed domains.

## Future CORS Requirements (Documented, Not Implemented Here)

- Backend should allow only explicit frontend origins per environment.
- Credentialed requests for refresh/logout/session flows require correct CORS + cookie alignment.
- Wildcard origins should be avoided for auth endpoints in production.

## Secrets Handling Principles

- Never commit real secrets to repository.
- Use platform-managed env vars (Vercel/Railway/Supabase dashboards).
- Rotate credentials/keys on exposure risk.
- Keep JWT private key and provider secrets backend-only.

## GitHub/Repository Connection Expectations (Later Manual Step)

- Vercel project will later connect to this repository with root directory set to `frontend/`.
- Railway service will later connect to this repository with root directory set to `backend/`.
- Supabase project is provisioned separately; connection URL is then set in Railway env vars.
- This phase intentionally does not perform account linking, CLI login, or auto-deploy setup.

## What Is Already Prepared

- Frontend Vite scaffold with Vercel-friendly config file (`frontend/vercel.json`).
- Backend Node.js scaffold with Railway starter config (`backend/railway.toml`).
- Environment example files for both frontend and backend.
- DB folder with schema/documentation placeholders.

## Deferred to Later Phases

- Real platform project creation and repository linking.
- OAuth provider application setup and callback URL registration.
- JWT key management strategy implementation.
- Runtime cookie and CORS middleware implementation.
- Real DB schema migration and connection runtime code.

## Recommended Deployment Order (Later)

1. Create Supabase project and capture PostgreSQL connection details.
2. Deploy backend from `backend/` to Railway and set backend env vars.
3. Deploy frontend from `frontend/` to Vercel and set frontend env vars.
4. Configure cross-origin/cookie settings and provider callback URLs.
5. Validate health, callback routing, refresh/logout behavior after implementation phase.
