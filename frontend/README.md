# Mano frontend

Next.js, TypeScript, and Tailwind CSS. See the repository root README for the
complete Docker setup and environment variables.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Jobs are kept in the browser and copied to FastAPI in the
background through the app's `/backend` route (`BACKEND_URL`, default `http://127.0.0.1:8000`).
Gemini routes (`/api/extract`, `/api/read-note`, `/api/ojo-suggest`) need `GEMINI_API_KEY`. For local development,
set overrides in an ignored `.env.local`; Docker builds use the root `.env`.

```sh
npx tsc --noEmit --incremental false
npm run build
npm start
```

The production server also uses port 3000. No authentication is required.
