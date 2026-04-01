# nAuth Backend

Node.js + Express foundation for the nAuth microservice.

## Scripts
- `npm run dev` - start backend in watch mode
- `npm start` - run backend in normal mode
- `npm run register:coordinator` - run manual Coordinator Stage 1 registration
- `npm run upload-migration` - run manual Coordinator Stage 2 migration upload
- `npm run generate:jwt-keys` - generate local RSA key pair for JWT signing

## Implemented now
- Minimal HTTP server bootstrapping
- Request body parsing middleware
- `/health` endpoint with safe DB connectivity status
- Centralized not-found and error middleware
- Config + environment variable scaffolding
- PostgreSQL runtime connectivity foundation via `DATABASE_URL`
- Reusable DB client module and common repository query base
- OAuth scaffolding endpoints:
  - `GET /auth/google/start`
  - `GET /auth/google/callback`
  - `GET /auth/github/start`
  - `GET /auth/github/callback`
- Provider callback token exchange + profile fetch + normalization (Google/GitHub)
- Temporary OAuth state protection (in-memory + HTTPOnly state cookie, non-final)
- Signed Coordinator directory lookup after provider callback (no payload encryption, TLS transport)
- Access token issuance (RS256) for `AUTHENTICATED_LINKED`
- Refresh token stored only in HTTPOnly cookie and persisted as hash-only in DB
- `POST /auth/refresh` for refresh token rotation + access token renewal
- `POST /auth/logout` for refresh token/session invalidation
- OAuth callback business decision states:
  - `AUTHENTICATED_LINKED`
  - `AUTHENTICATED_NO_ORG`
  - `USER_NOT_FOUND`
  - `LOOKUP_FAILED`
- Server-side lookup storage prepared for `directory_user_id`, `full_name`, `organization_id`, `organization_name`
- Coordinator Stage 1 auto-registration on startup with `SERVICE_ID` guard
- Coordinator Stage 2 auto-migration on startup with `MIGRATION_UPLOADED` guard

## Intentionally NOT implemented yet
- Frontend integration for authenticated screens
- Expanded authorization model/policies

## JWT key preparation
- Run `npm run generate:jwt-keys` from `backend/`.
- Keys are created locally in `backend/keys/`:
  - `jwt-private.pem`
  - `jwt-public.pem`
- Copy these values manually to Railway:
  - `JWT_PRIVATE_KEY`
  - `JWT_PUBLIC_KEY`
- Recommended defaults in `.env.example`:
  - `JWT_ISSUER=nauth-service`
  - `JWT_AUDIENCE=educore-platform`

## Deployment target
- Intended runtime: Railway
- When configuring Railway later, use `backend/` as the service root directory.
- Database target for this service is Supabase PostgreSQL via environment-provided connection URL(s).

## Database runtime connectivity
- Backend reads PostgreSQL runtime connection from `DATABASE_URL`.
- A centralized DB client module (`src/config/database.js`) manages reusable pool/query access.
- DB health probe uses `SELECT 1` through `src/services/databaseService.js`.
- Health endpoint stays stable and reports DB status in response metadata.
- This phase prepares runtime connectivity only; auth persistence behavior is deferred.

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
  - `{ requester_service, payload, response }`
- No user/org data is stored in cookies; server-side structure is prepared only.

## Auth token and session policy
- Token issuance/session creation happens only when `authState === AUTHENTICATED_LINKED`.
- Access token is returned in response body.
- Refresh token is never returned in JSON responses.
- Refresh token raw value is never stored in DB; only SHA-256 hash is stored.
- Refresh token transport is HTTPOnly cookie only (`COOKIE_DOMAIN`, `COOKIE_SECURE`, `COOKIE_SAME_SITE` driven).
