# Coordinator Basic Registration (Stage 1)

## Purpose

Register `nAuth` with Coordinator using Stage 1 only (`/register`) and print `SERVICE_ID`.
This registration is attempted automatically on startup with a safe guard.

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

## Logging Contract (Success Case)

```
========================================
nAuth registration successful
SERVICE_ID = <value>
IMPORTANT: Save this value in Railway ENV as SERVICE_ID
========================================
```

## Optional Manual Stage 1 Run

From `backend/`:

`npm run register:coordinator`

## Safety Rules

- Startup registration must not crash the service on failure; errors are logged clearly.
- No retry loops/background jobs are implemented.
- Re-registration behavior is controlled by `SERVICE_ID` presence in Railway ENV.

## Deferred

- Directory integration.
- Stage 2 migration upload.
- Any encrypted registration protocol using `COORDINATOR_PUBLIC_KEY`.
- JWT/session/refresh/logout business logic.
