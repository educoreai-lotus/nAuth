# Coordinator Registration (Stage 1 Auto, Stage 2 Auto With Env Guard)

## Purpose

Handle Coordinator integration in two parts:
1. Stage 1 registration (`/register`) on startup when `SERVICE_ID` is missing.
2. Stage 2 migration upload (`/register/{SERVICE_ID}/migration`) on startup with `MIGRATION_UPLOADED` guard.

## Required Environment Variables

- `COORDINATOR_API_URL` (required): Coordinator base API URL.
- `BACKEND_BASE_URL` (required): Public nAuth backend URL used as service endpoint.
- `SERVICE_ID` (optional but important): if present, startup registration is skipped.
- `MIGRATION_UPLOADED` (manual Stage 2 guard): if set to `1`, migration upload script skips re-upload.
- `COORDINATOR_PUBLIC_KEY` (optional placeholder): reserved for future encrypted communication protocol.

> `COORDINATOR_PUBLIC_KEY` is not used yet because no concrete encryption protocol/contract is defined.

## Startup Auto-Registration Behavior

On each service startup:
1. If `SERVICE_ID` exists: skip registration and log:
   - `Service already registered. Skipping registration.`
2. If `SERVICE_ID` is missing:
   - POST `${COORDINATOR_API_URL}/register`
   - payload:
     - `serviceName`: `nAuth`
     - `version`: `0.1.0`
     - `endpoint`: `${BACKEND_BASE_URL}`
     - `healthCheck`: `/health`
   - expect `serviceId` and status `pending_migration` (or compatible)
   - print clear output instructing manual save of `SERVICE_ID` in Railway.

## Stage 2 Startup Migration Upload

On startup:
1. If `SERVICE_ID` is missing:
   - skip migration upload.
2. If `SERVICE_ID` exists and `MIGRATION_UPLOADED === "1"`:
   - log: `Migration already uploaded. Skipping.`
3. If `SERVICE_ID` exists and `MIGRATION_UPLOADED` is missing/not `1`:
   - call:
     - `POST ${COORDINATOR_API_URL}/register/{SERVICE_ID}/migration`
   - body:
     - `{ migrationFile: <payload> }`
4. On success log:
   - `IMPORTANT: Set MIGRATION_UPLOADED=1 in Railway ENV`

## Optional Manual Stage 1 Run

From `backend/`:

`npm run register:coordinator`

## Safety Rules

- Startup registration must not crash the service on failure; errors are logged clearly.
- No retry loops/background jobs are implemented.
- No GET status-check dependency is used for migration.
- Re-registration behavior is controlled by `SERVICE_ID` presence in Railway ENV.
- Migration re-upload avoidance is controlled manually via `MIGRATION_UPLOADED=1`.

## Deferred

- Directory integration.
- Any GET `/register/{SERVICE_ID}` status-check flow.
- Any encrypted registration protocol using `COORDINATOR_PUBLIC_KEY`.
- JWT/session/refresh/logout business logic.
