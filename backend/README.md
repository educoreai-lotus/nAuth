# nAuth Backend

Node.js + Express foundation for the nAuth microservice.

## Scripts
- `npm run dev` - start backend in watch mode
- `npm start` - run backend in normal mode

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
