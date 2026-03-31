# Coordinator Directory Lookup (Signed)

## Purpose

After OAuth provider callback normalization, nAuth calls Coordinator to route identity lookup to Directory.

This step returns Directory identity context and maps it to auth decision states.

## Security Model

- Transport confidentiality: HTTPS/TLS.
- Application-level authenticity/integrity: digital signature.
- No payload encryption is implemented in this phase.

### Signing Rules

1. `payloadString = JSON.stringify(payload)`
2. `payloadHash = sha256(payloadString)`
3. `message = "educoreai-nAuth-" + payloadHash`
4. Sign `message` using ECDSA P-256 + SHA-256 with `NAUTH_PRIVATE_KEY`
5. Send headers:
   - `X-Service-Name: nAuth`
   - `X-Signature: <base64 signature>`

## Required Headers

- `Content-Type: application/json`
- `X-Service-Name: nAuth`
- `X-Signature: <base64 signature>`

## Request Envelope

```json
{
  "requester_name": "nAuth",
  "payload": {},
  "response": {
    "user_exists": false,
    "user_id": "",
    "full_name": "",
    "organization_id": "",
    "organization_name": ""
  }
}
```

## Payload Rules

Only provider-derived identity fields are sent.
Do not send empty/undefined/null values.

### Google Example

```json
{
  "provider": "google",
  "email": "user@example.com"
}
```

### GitHub Example

```json
{
  "provider": "github",
  "github_profile_url": "https://github.com/username",
  "provider_user_id": "123456"
}
```

If GitHub email exists, include `"email"`.

## Decision States

- `AUTHENTICATED_LINKED`:
  - `user_exists = true` and `organization_id` exists
- `AUTHENTICATED_NO_ORG`:
  - `user_exists = true` and `organization_id` missing
- `USER_NOT_FOUND`:
  - `user_exists = false`
- `LOOKUP_FAILED`:
  - invalid response or request failure

## Server-Side Storage Preparation

Current flow stores lookup output server-side (in-memory scaffold) for:
- `directory_user_id`
- `full_name`
- `organization_id`
- `organization_name`

No cookies are used for these fields.

## Deferred

- JWT issuance
- session issuance/management
- refresh/logout logic
- Directory contract hardening/final schema
