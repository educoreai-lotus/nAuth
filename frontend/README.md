# nAuth Frontend

React + JavaScript + Tailwind starter for the nAuth microservice UI.

## Scripts
- `npm run dev` - start local development server
- `npm run build` - build production assets
- `npm run preview` - preview production build

## Notes
- OAuth starts by redirecting browser to backend endpoints (`/auth/google/start`, `/auth/github/start`).
- Auth bootstrap runs via `POST /auth/refresh` on app startup.
- Refresh token is HTTPOnly cookie only (frontend never reads or stores it).
- Access token is kept in in-memory React state only.
- Login decision states are handled in UI:
  - `AUTHENTICATED_LINKED`
  - `AUTHENTICATED_NO_ORG`
  - `USER_NOT_FOUND`
  - `LOOKUP_FAILED`
- Designed for Vercel deployment (static Vite output).
- When configuring Vercel later, use `frontend/` as the project root directory.
- Optional host-only RAG chatbot (code defaults; no Vercel RAG vars required):
  - `VITE_RAG_EMBED_URL` — optional override for RAG `bot.js` URL
  - `VITE_RAG_HOST_ID` — optional authenticated host override (default `NAUTH_PORTAL`)
  - Public/unauthenticated: Guest widget via `NAUTH_PUBLIC` + `allowGuest: true`
  - Authenticated: real access token, `directoryUserId`, and `organizationId` (no Guest fallback)
  - Does not change OAuth, JWT issuance, or Directory `#access_token` handoff
