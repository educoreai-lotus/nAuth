# nAuth Backend

Node.js + Express foundation for the nAuth microservice.

## Scripts
- `npm run dev` - start backend in watch mode
- `npm start` - run backend in normal mode
- `npm run register:coordinator` - run manual Coordinator Stage 1 registration

## Implemented now
- Minimal HTTP server bootstrapping
- Request body parsing middleware
- `/health` endpoint
- Centralized not-found and error middleware
- Config + environment variable scaffolding
- OAuth scaffolding endpoints:
  - `GET /auth/google/start`
  - `GET /auth/google/callback`
  - `GET /auth/github/start`
  - `GET /auth/github/callback`
- Provider callback token exchange + profile fetch + normalization (Google/GitHub)
- Temporary OAuth state protection (in-memory + HTTPOnly state cookie, non-final)
- Coordinator Stage 1 auto-registration on startup with `SERVICE_ID` guard
- Coordinator Stage 2 auto-migration upload on startup based on Coordinator status

## Intentionally NOT implemented yet
- Final authentication/session business logic after provider callback
- JWT issuing/signing
- Refresh token and logout flows
- Coordinator/Directory integration
- Real database integration

## Deployment target
- Intended runtime: Railway
- When configuring Railway later, use `backend/` as the service root directory.
- Database target for this service is Supabase PostgreSQL via environment-provided connection URL(s).

## Coordinator registration
- Startup behavior:
  - If `SERVICE_ID` exists in env: skip registration.
  - If `SERVICE_ID` is missing: attempt Stage 1 registration and print returned `SERVICE_ID`.
- Save printed `SERVICE_ID` manually in Railway ENV to prevent duplicate registration on future deploys.
- When `SERVICE_ID` exists, startup checks `GET /register/{SERVICE_ID}`:
  - `active` -> skip migration
  - `pending_migration` -> auto-upload migration via `POST /register/{SERVICE_ID}/migration`
- Coordinator status is the source of truth (no extra migration flags).
- See `backend/docs/coordinator-registration.md` for details.
