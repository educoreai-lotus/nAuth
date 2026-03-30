# nAuth Backend

Node.js + Express foundation for the nAuth microservice.

## Scripts
- `npm run dev` - start backend in watch mode
- `npm start` - run backend in normal mode

## Implemented now
- Minimal HTTP server bootstrapping
- Request body parsing middleware
- `/health` endpoint
- Centralized not-found and error middleware
- Config + environment variable scaffolding

## Intentionally NOT implemented yet
- Authentication business logic
- OAuth provider integrations
- JWT issuing/signing
- Refresh token and logout flows
- Real database integration

## Deployment target
- Intended runtime: Railway
- When configuring Railway later, use `backend/` as the service root directory.
- Database target for this service is Supabase PostgreSQL via environment-provided connection URL(s).
