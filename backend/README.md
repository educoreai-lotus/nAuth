# nAuth Backend

Node.js + Express foundation for the nAuth microservice.

## Scripts
- `npm run dev` - start backend in watch mode
- `npm start` - run backend in normal mode
- `npm run register:coordinator` - run manual Coordinator Stage 1 registration
- `npm run upload-migration` - run manual Coordinator Stage 2 migration upload

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
- Signed Coordinator directory lookup after provider callback (no payload encryption, TLS transport)
- OAuth callback business decision states:
  - `AUTHENTICATED_LINKED`
  - `AUTHENTICATED_NO_ORG`
  - `USER_NOT_FOUND`
  - `LOOKUP_FAILED`
- Server-side lookup storage prepared for `directory_user_id`, `full_name`, `organization_id`, `organization_name`
- Coordinator Stage 1 auto-registration on startup with `SERVICE_ID` guard
- Coordinator Stage 2 auto-migration on startup with `MIGRATION_UPLOADED` guard

## Intentionally NOT implemented yet
- Final authentication/session business logic after provider callback
- JWT issuing/signing
- Refresh token and logout flows
- Persisting lookup/session records to DB
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
- Stage 2 migration runs on startup only when:
  - `SERVICE_ID` exists
  - `MIGRATION_UPLOADED` is missing or not equal to `1`
- It calls `POST /register/{SERVICE_ID}/migration`.
- If `MIGRATION_UPLOADED=1`, migration upload is skipped.
- After successful upload, set `MIGRATION_UPLOADED=1` manually in Railway ENV.
- No GET `/register/{SERVICE_ID}` status-check is used.
- See `backend/docs/coordinator-registration.md` for details.

## Coordinator directory lookup
- nAuth sends signed request payloads to Coordinator for Directory routing.
- Signature model:
  - `payloadString = JSON.stringify(payload)`
  - `payloadHash = sha256(payloadString)`
  - `message = "educoreai-nAuth-" + payloadHash`
  - sign with ECDSA P-256 + SHA-256 using `NAUTH_PRIVATE_KEY`
- Required headers:
  - `Content-Type: application/json`
  - `X-Service-Name: nAuth`
  - `X-Signature: <base64 signature>`
- Request envelope:
  - `{ requester_name, payload, response }`
- No user/org data is stored in cookies; server-side structure is prepared only.
