export function buildNauthMigrationPayload() {
  return {
    version: '0.1.0',
    description: 'nAuth authentication microservice migration payload.',
    tables: ['auth_users', 'provider_identities', 'sessions', 'refresh_tokens'],
    api: {
      endpoints: [
        {
          path: '/health',
          method: 'GET',
          description: 'Service health check endpoint.',
          requestSchema: {},
          responseSchema: {
            success: 'boolean',
            data: {
              service: 'string',
              status: 'string',
              environment: 'string',
              timestamp: 'string',
            },
          },
        },
        {
          path: '/auth/:provider/start',
          method: 'GET',
          description: 'Start OAuth authorization redirect for supported providers.',
          requestSchema: { params: { provider: 'google|github' } },
          responseSchema: { redirect: 'provider_authorization_url' },
        },
        {
          path: '/auth/:provider/callback',
          method: 'GET',
          description: 'Handle OAuth callback, exchange code, and normalize identity.',
          requestSchema: {
            params: { provider: 'google|github' },
            query: { code: 'string', state: 'string' },
          },
          responseSchema: {
            success: 'boolean',
            data: {
              providerIdentity: {
                provider: 'string',
                provider_user_id: 'string',
                email: 'string|null',
                display_name: 'string|null',
                github_profile_url: 'string|null',
                provider_metadata: 'object',
              },
            },
          },
        },
      ],
    },
    capabilities: [
      'authentication',
      'oauth authentication',
      'google login',
      'github login',
      'provider_identity_normalization',
      'authentication microservice',
    ],
    events: {
      publishes: [],
      subscribes: [],
    },
    dependencies: [],
  }
}
