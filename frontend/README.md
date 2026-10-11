# Mano frontend

Next.js, TypeScript, and Tailwind CSS. See the repository root README for the
complete Docker setup and environment variables.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The frontend currently uses browser-stored demo
business/job data. The existing microphone upload calls FastAPI using
`NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`). For local development,
set overrides in an ignored `.env.local`; Docker builds use the root `.env`.

```sh
npx tsc --noEmit --incremental false
npm run build
npm start
```

The production server also uses port 3000. No authentication is required.
