# Coordinator Registration and Auto-Migration

## Purpose

Handle Coordinator integration during startup in two safe parts:
1. Stage 1 registration (`/register`) when `SERVICE_ID` is missing.
2. Stage 2 migration upload (`/register/{SERVICE_ID}/migration`) when Coordinator status is `pending_migration`.

## Required Environment Variables

- `COORDINATOR_API_URL` (required): Coordinator base API URL.
- `BACKEND_BASE_URL` (required): Public nAuth backend URL used as service endpoint.
- `SERVICE_ID` (optional but important): if present, startup registration is skipped.
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

## Startup Auto-Migration Behavior

After Stage 1 handling, startup checks Coordinator status when `SERVICE_ID` exists:

1. `GET ${COORDINATOR_API_URL}/register/{SERVICE_ID}`
2. If status is `active`:
   - log: `Service already active. Skipping migration.`
3. If status is `pending_migration`:
   - upload migration via:
     - `POST ${COORDINATOR_API_URL}/register/{SERVICE_ID}/migration`
   - on success log:
     - `Migration successful. nAuth is now ACTIVE.`
4. If status is unknown:
   - log clear error and skip safely.

## Optional Manual Stage 1 Run

From `backend/`:

`npm run register:coordinator`

## Safety Rules

- Startup registration must not crash the service on failure; errors are logged clearly.
- Startup migration check/upload must not crash the service on failure; errors are logged clearly.
- No retry loops/background jobs are implemented.
- No migration sent flags are used; Coordinator status is the single source of truth.
- Re-registration behavior is controlled by `SERVICE_ID` presence in Railway ENV.

## Deferred

- Directory integration.
- Any encrypted registration protocol using `COORDINATOR_PUBLIC_KEY`.
- JWT/session/refresh/logout business logic.
