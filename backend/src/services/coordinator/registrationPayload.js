export function buildNauthMigrationPayload() {
  return {
    version: '0.1.0',
    description: 'nAuth authentication microservice registration payload.',
    tables: ['auth_users', 'provider_identities', 'sessions', 'refresh_tokens'],
    apiEndpoints: ['/health', '/auth/:provider/start', '/auth/:provider/callback'],
    capabilities: [
      'oauth_authentication_scaffolding',
      'provider_identity_normalization',
      'future_session_token_management',
    ],
    capabilityNotes: {
      future_session_token_management:
        'JWT issuance, refresh/logout, and full session lifecycle logic are deferred.',
    },
    events: [],
  }
}
