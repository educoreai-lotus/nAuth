# nAuth Technical Specification (Scaffold Phase)

## 1. Purpose and Scope

### Role of nAuth
- `nAuth` is the authentication microservice for the ecosystem.
- It owns authentication entry points, session lifecycle, token lifecycle, and provider-based login orchestration.
- It does **not** own system-wide authorization policy decisions at this stage.

### In Scope (Current Direction)
- Backend API contract definition for auth/session endpoints.
- Frontend/backend contract for auth initiation and session state handling.
- Token/session strategy definition (access + refresh model).
- Security and error-handling principles for future implementation.
- Future flow definition for user lookup via `Coordinator` to `Directory`.

### Explicitly Out of Scope (For Now)
- Full endpoint implementation.
- OAuth provider SDK wiring and provider-specific code.
- JWT signing implementation details and key management implementation.
- Refresh/logout implementation code.
- System-wide service-to-service communication patterns beyond documented future flow.
- Authorization (RBAC/ABAC/policy engine) design.

## 2. High-Level Architecture Responsibilities

### Frontend (`frontend/` - React + JavaScript + Tailwind)
- Initiates authentication with selected provider via backend endpoints.
- Handles callback landing state and displays user decision states.
- Calls session-related endpoints (`status`, `refresh`, `logout`) as needed.
- Must never store refresh tokens in `localStorage`, `sessionStorage`, or JS-readable cookies.
- Treats backend response states as source of truth for auth status.

### Backend (`backend/` - Node.js + JavaScript)
- Exposes auth/session API surface.
- Handles provider login initiation and callback processing.
- Creates and tracks sessions.
- Issues short-lived access token and sets refresh token cookie.
- Performs refresh/logout logic using session + refresh token validation.
- Maintains security controls, audit-friendly logs, and generic external error responses.

### Database (`DB/` - relational, Supabase PostgreSQL target)
- Stores user-auth linkage data and session records.
- Stores refresh token material in hashed form only.
- Supports revocation and rotation tracking metadata.
- Stores provider identity references and normalization outputs (model to be finalized).

### Future `Coordinator` Role (Specific Lookup Flow)
- Acts as orchestration layer between `nAuth` and downstream services.
- Receives lookup requests from `nAuth` and forwards them to `Directory`.
- Returns standardized lookup responses back to `nAuth`.
- Exact request/response contract is to be finalized.

### Future `Directory` Role (Specific Lookup Flow)
- Resolves user/company association and matching state using internal directory data.
- Returns match/no-match/pending outcomes used by `nAuth` decision logic.
- Does not perform session/token issuance; that remains `nAuth` responsibility.

## 3. Core Auth Flows (Planned)

### A) Provider Login Initiation Flow
1. Frontend user selects provider (e.g., Google/GitHub in future).
2. Frontend calls backend auth start endpoint for selected provider.
3. Backend validates provider availability/config.
4. Backend creates transient state data (anti-CSRF/state handling model to be finalized).
5. Backend responds with redirect target or performs redirect (final behavior to be finalized).

### B) Provider Callback Flow
1. Provider redirects user-agent to backend callback endpoint.
2. Backend validates callback state and provider response.
3. Backend extracts provider profile identifiers (normalization rules to be finalized).
4. Backend triggers future user lookup path (`nAuth -> Coordinator -> Directory`).
5. Backend receives lookup result and executes internal decision state logic.

### C) Future Coordinator -> Directory User Lookup Flow
1. `nAuth` builds lookup payload from normalized provider profile.
2. `nAuth` sends request to `Coordinator`.
3. `Coordinator` forwards request to `Directory`.
4. `Directory` returns lookup result (linked / pending / not found / error class).
5. `Coordinator` returns normalized response to `nAuth`.

### D) Decision Flow After Directory Lookup
1. If user is valid and organization-linked: continue with session creation.
2. If user is valid but company association pending: mark session/user as pending state.
3. If provider auth succeeded but internal continuation fails: return recoverable error state.
4. If authentication invalid/failed: terminate flow and return failure response.

### E) Session Creation Flow
1. Backend creates session record with device/request metadata (fields to be finalized).
2. Backend generates refresh token secret value.
3. Backend stores hashed refresh token representation in DB (never raw token).
4. Backend binds session state to user and decision state outcome.

### F) Access Token Issuance Flow
1. Backend generates short-lived signed access token (JWT strategy planned).
2. Backend returns access token in response body (exact response envelope to be finalized).
3. Access token includes minimum necessary claims (exact claims to be finalized).

### G) Refresh Flow
1. Client calls refresh endpoint with browser cookie automatically attached.
2. Backend reads refresh token from HTTPOnly cookie only.
3. Backend verifies cookie token against hashed DB record + session state.
4. Backend rotates refresh token and session metadata if valid (rotation details to be finalized).
5. Backend returns new short-lived access token and sets updated refresh cookie.

### H) Logout Flow
1. Client calls logout endpoint.
2. Backend invalidates session and refresh-token record(s) per policy.
3. Backend clears refresh token cookie.
4. Backend returns logout success response without exposing sensitive internals.

## 4. User Decision States After Login

### `AUTHENTICATED_LINKED`
- Provider authentication succeeded.
- User is linked to required organization/company context.
- Session is active; normal authenticated flow can continue.

### `AUTHENTICATED_PENDING_ASSOCIATION`
- Provider authentication succeeded.
- User identity is known but company/organization linking is incomplete or pending.
- Session behavior may be constrained; frontend should show pending-state UX.

### `AUTHENTICATION_BLOCKED_INTERNAL_CONTINUATION_FAILED`
- Provider authentication succeeded.
- Internal continuation (lookup/mapping/policy precondition) failed.
- User is not fully authenticated into application context.

### `AUTHENTICATION_FAILED`
- Provider auth or callback validation failed.
- No active authenticated session should be established.

## 5. Planned API Surface (Contract Draft)

> All endpoints below are planned and not fully implemented yet.

### `GET /health`
- **Purpose:** service health verification.
- **Method:** `GET`
- **Request shape:** no body.
- **Response shape:** `{ success: boolean, data: { service, status, environment, timestamp } }`
- **Notes:** already scaffolded as baseline infrastructure endpoint.

### `GET /auth/:provider/start`
- **Purpose:** initiate provider auth flow.
- **Method:** `GET`
- **Request shape:** path param `provider`; optional query/context metadata (to be finalized).
- **Response shape:** redirect or `{ success, data: { authorizationUrl } }` (to be finalized).
- **Notes:** includes provider validation and state generation.

### `GET /auth/:provider/callback`
- **Purpose:** receive provider callback and continue internal auth flow.
- **Method:** `GET`
- **Request shape:** provider callback query params + state.
- **Response shape:** success with session/access context or error state object.
- **Notes:** triggers future Coordinator/Directory lookup.

### `POST /auth/refresh`
- **Purpose:** rotate/refresh session and issue new access token.
- **Method:** `POST`
- **Request shape:** no refresh token in body; token sourced from HTTPOnly cookie.
- **Response shape:** `{ success, data: { accessToken, expiresIn, authState } }`
- **Notes:** refresh cookie rotation behavior to be finalized.

### `POST /auth/logout`
- **Purpose:** terminate active session/logout.
- **Method:** `POST`
- **Request shape:** optional context (e.g., logout-all flag to be finalized).
- **Response shape:** `{ success: true }` (or equivalent minimal envelope).
- **Notes:** must clear cookie and revoke session/refresh material.

### `GET /auth/session` (Optional but Recommended)
- **Purpose:** return current session/auth decision state for frontend bootstrapping.
- **Method:** `GET`
- **Request shape:** cookie and/or bearer access token (final validation model to be finalized).
- **Response shape:** `{ success, data: { isAuthenticated, authState, userSummary } }`
- **Notes:** helps frontend represent pending vs linked state deterministically.

## 6. Token and Session Strategy (Intended Model)

### Access Token
- JWT-based, signed token model is planned.
- Lifetime should be short (exact TTL to be finalized).
- Intended for API authorization context only; avoid long-term persistence in browser storage.

### Refresh Token
- Refresh token must be stored **only** in an HTTPOnly cookie.
- Cookie should be configured for secure transport and scoped path/domain (final production config to be finalized).
- Raw refresh token value must never be stored in plaintext in DB.

### Refresh Token DB Storage
- Store hashed refresh token value (one-way hash strategy to be finalized).
- Keep metadata for rotation and revocation checks (timestamps, status, session linkage).
- Comparison is hash-based validation against cookie-provided token.

### Session Tracking
- Session entity should represent login lifecycle state and revocation state.
- Supports one or multiple sessions per user depending on final policy (to be finalized).
- Session status drives refresh and logout behavior.

### Revocation and Rotation Concepts
- Refresh tokens should be rotated on refresh.
- Old token material should be invalidated after rotation.
- Logout should revoke active session token chain according to chosen scope.

## 7. Frontend-Backend Contract

### Frontend Initiation Responsibilities
- Trigger provider start endpoint based on user action.
- Route callback completion states to user-facing flow screens.
- Call refresh and logout endpoints without handling raw refresh tokens.

### Backend Return Expectations
- Return deterministic `authState`-style outcomes for UI logic.
- Return short-lived access token response data when session is valid.
- Set/clear refresh cookie through server-side headers only.

### Frontend Storage Rules
- Frontend must not store refresh tokens in any JS-readable storage.
- Avoid persisting sensitive access token data beyond minimal runtime needs (exact handling to be finalized).
- No token logging in client console/error telemetry.

### Pending/Waiting State Representation
- UI should explicitly represent pending association and blocked continuation states.
- Frontend should use API-provided auth state rather than inferring from provider callback alone.

### Conceptual Refresh/Logout Behavior
- Refresh: transparent renewal attempt using cookie; update runtime auth state.
- Logout: backend-driven session termination; frontend clears in-memory auth context and redirects accordingly.

## 8. Error Handling and Security Principles

### External Error Responses
- Return generic, non-sensitive error messages to clients.
- Avoid exposing provider internals, token values, or DB decision detail in responses.

### Internal Logging
- Log correlation identifiers and operation stage, not raw secrets.
- Keep enough structured context for troubleshooting callback/refresh/logout failures.
- Redact provider tokens, refresh tokens, and sensitive headers.

### Least-Privilege / Minimal Exposure
- Only expose required endpoints and minimal response fields.
- Keep token claims and payloads minimal and purpose-bound.
- Restrict internal service contracts to required fields only.

### Sensitive Token Handling Principles
- HTTPOnly cookie for refresh token reduces JS-access risk.
- Hashed DB storage mitigates risk if token table data is exposed.
- Combined cookie + hash validation reduces impact of single-surface compromise.

## 9. Open Questions / Implementation Notes (To Be Finalized)

- Exact JWT claim set (`sub`, `iss`, `aud`, custom claims, session ID claim).
- JWT signing algorithm, key format, key rotation cadence, and key distribution.
- Exact relational schema for users/identities/sessions/refresh-token chains.
- Provider profile normalization map and conflict resolution rules.
- Exact `nAuth -> Coordinator -> Directory` request/response contract and error taxonomy.
- Final CORS policy and cookie attributes in production (`Secure`, `SameSite`, domain/path).
- Session concurrency policy (single-session vs multi-session per user).
- Logout scope (`current session` vs `all sessions`) default behavior.
- Refresh rotation replay-detection strategy and grace window rules.

## 10. Non-Goals for This Stage

- Implementing auth/OAuth/JWT/session business logic.
- Implementing provider SDK integrations or callback handlers.
- Implementing DB migrations and live Supabase connectivity.
- Implementing authorization model across the wider microservice ecosystem.
- Implementing full Coordinator-wide service integration.
- Defining final production secrets management and key infrastructure.
