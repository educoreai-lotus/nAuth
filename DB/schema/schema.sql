-- nAuth relational schema (design-phase SQL)
-- Target engine: PostgreSQL (Supabase PostgreSQL)
-- Scope: data-model definition only; no runtime auth logic.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared trigger to keep updated_at current on row updates.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Internal auth-layer principal record only.
-- nAuth does not own full user profile/business attributes.
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'disabled', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_auth_users_updated_at
BEFORE UPDATE ON auth_users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Links nAuth principals to external auth identities only.
-- This table is not a general user profile store.
-- Provider remains TEXT for easy future extensibility.
CREATE TABLE IF NOT EXISTS provider_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  email TEXT,
  github_profile_url TEXT,
  linkedin_profile_url TEXT,
  -- Minimal provider-derived metadata used only for auth/linkage support.
  -- Do not store rich business profile data here.
  profile_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_provider_name CHECK (
    provider IN ('google', 'github', 'linkedin') OR provider LIKE 'custom_%'
  ),
  CONSTRAINT uq_provider_identity UNIQUE (provider, provider_user_id),
  CONSTRAINT uq_user_provider UNIQUE (auth_user_id, provider),
  CONSTRAINT chk_profile_metadata_object CHECK (jsonb_typeof(profile_metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_provider_identities_auth_user_id
  ON provider_identities(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_provider_identities_email_lower
  ON provider_identities(LOWER(email))
  WHERE email IS NOT NULL;

CREATE TRIGGER trg_provider_identities_updated_at
BEFORE UPDATE ON provider_identities
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Server-side auth session lifecycle only.
-- No broader business/user-domain ownership is modeled here.
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked', 'expired', 'logged_out', 'suspicious')),
  auth_decision_state TEXT NOT NULL
    CHECK (
      auth_decision_state IN (
        'AUTHENTICATED_LINKED',
        'AUTHENTICATED_PENDING_ASSOCIATION',
        'AUTHENTICATION_BLOCKED_INTERNAL_CONTINUATION_FAILED',
        'AUTHENTICATION_FAILED'
      )
    ),
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sessions_expiry_after_create CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_sessions_auth_user_id
  ON sessions(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_status
  ON sessions(status);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
  ON sessions(expires_at);

CREATE TRIGGER trg_sessions_updated_at
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Rotating refresh token lifecycle records.
-- Hashes only; raw refresh token values must never be stored.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  token_hash_algo TEXT NOT NULL DEFAULT 'sha256',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'rotated', 'revoked', 'reused_detected', 'expired')),
  parent_token_id UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  replaced_by_token_id UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  reuse_detected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash),
  CONSTRAINT chk_refresh_tokens_expiry_after_create CHECK (expires_at > created_at),
  CONSTRAINT chk_refresh_tokens_replacement_self_ref CHECK (
    replaced_by_token_id IS NULL OR replaced_by_token_id <> id
  ),
  CONSTRAINT chk_refresh_tokens_parent_self_ref CHECK (
    parent_token_id IS NULL OR parent_token_id <> id
  )
);

-- Optional policy assumption: one active refresh token row per session.
-- Revisit if multiple concurrent active chains per session are needed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_refresh_tokens_active_per_session
  ON refresh_tokens(session_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_id
  ON refresh_tokens(session_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_parent_token_id
  ON refresh_tokens(parent_token_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_replaced_by_token_id
  ON refresh_tokens(replaced_by_token_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
  ON refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_status
  ON refresh_tokens(status);

CREATE TRIGGER trg_refresh_tokens_updated_at
BEFORE UPDATE ON refresh_tokens
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
