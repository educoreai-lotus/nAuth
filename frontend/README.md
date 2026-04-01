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
