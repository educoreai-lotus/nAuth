# nAuth Schema Notes

## Scope

This document describes the design-phase relational model for the nAuth service.
It defines table responsibilities, relationships, and security-oriented token storage rules.

This is schema/data-model work only. Runtime auth logic is intentionally deferred.

## Architectural Boundary (Critical)

- nAuth stores authentication-layer references and session/token lifecycle data only.
- nAuth is **not** the source of truth for full user profile or business/domain identity data.
- Directory and external business systems remain the source of truth for broader user/business information.
- Provider-derived values in nAuth must be minimal and strictly auth-supporting (linkage/matching context).

## Tables and Purpose

### `auth_users`
- Internal auth-layer principal record.
- Represents nAuth lifecycle state (`active`, `suspended`, `disabled`, `deleted`).
- Not intended to mirror the wider business/domain user model.

### `provider_identities`
- Maps one `auth_user` to external provider accounts.
- Stores provider source (`google`, `github`, `linkedin`, future `custom_*`) and provider user identifier.
- Supports optional provider profile fields (`email`, `github_profile_url`, `linkedin_profile_url`).
- Stores additional provider-derived metadata in `profile_metadata` (`JSONB`) only when needed for auth linkage/matching.
- Must not be used as a general profile/document store.

### `sessions`
- Server-side session lifecycle record linked to `auth_users`.
- Tracks session status, auth decision state, expiry, and request/device metadata.
- Supports future revocation operations through status and revocation fields.

### `refresh_tokens`
- Stores refresh token records linked to `sessions`.
- Stores token hash only (`token_hash`); raw token values must never be persisted.
- Supports rotation chain with `parent_token_id` and `replaced_by_token_id`.
- Supports revocation and suspicious reuse/replay handling fields.

## Relationships

- `auth_users` (1) -> (many) `provider_identities`
- `auth_users` (1) -> (many) `sessions`
- `sessions` (1) -> (many) `refresh_tokens`
- `refresh_tokens` self-reference for token rotation lineage:
  - parent (previous token)
  - replaced_by (next token)

## Constraints and Indexing Decisions

### Identity constraints
- `provider_identities(provider, provider_user_id)` is unique to prevent duplicate provider linkage globally.
- `provider_identities(auth_user_id, provider)` is unique to prevent multiple identities of same provider for one auth user.

### Session constraints
- `sessions.expires_at > sessions.created_at` check to prevent invalid expiry records.
- Indexed by `auth_user_id`, `status`, and `expires_at` for common lifecycle queries.

### Refresh token constraints
- `refresh_tokens.token_hash` is unique.
- `refresh_tokens.expires_at > refresh_tokens.created_at` check for lifecycle consistency.
- Self-reference checks prevent token row from referencing itself as parent/replacement.
- Partial unique index enforces at most one `active` refresh token row per session (current assumption, to be finalized).

### Metadata indexes
- Email lookup support via lower-case index on `provider_identities.email` (nullable/partial).
- Rotation traversal support through indexes on `parent_token_id` and `replaced_by_token_id`.

## Security and Lifecycle Notes

### Why token hashes are stored instead of raw refresh tokens
- Reduces credential exposure impact if DB data is leaked.
- Keeps refresh validation hash-based rather than raw token comparison.
- Aligns with secure-token handling best practices for auth services.

### Rotation and revocation model (conceptual)
- On refresh, old token row can be marked `rotated` and linked to new token row.
- Token revocation is represented by status + revocation timestamps/reason.
- Suspicious reuse can be marked with `reused_detected` status and `reuse_detected_at`.
- Session can later be invalidated if token reuse/replay is detected.

## Reference-First Data Ownership Guidance

- Prefer storing durable external identifiers/references needed for auth continuity and future matching with Directory.
- Avoid storing broad user attributes (organization profile, HR metadata, preferences, business roles) in nAuth tables.
- If additional provider attributes are ever considered, they must be justified as auth/linkage necessities and kept minimal.

## PostgreSQL/Supabase Orientation

- Uses UUID primary keys with `gen_random_uuid()` (`pgcrypto` extension).
- Uses `JSONB` for provider metadata extension points.
- Uses `INET` for optional request IP capture.
- Uses `TIMESTAMPTZ` for timezone-safe lifecycle timestamps.

## Deferred to Later Implementation Phases (To Be Finalized)

- Exact hash algorithm/encoding strategy and pepper/key management.
- Exact refresh rotation policy (strict one-time use, grace windows, replay lockout behavior).
- Session concurrency policy (single active session vs multiple devices).
- Detailed provider profile normalization rules.
- Migration/versioning strategy and rollout procedure.
- Runtime DB connection handling in backend service code.
