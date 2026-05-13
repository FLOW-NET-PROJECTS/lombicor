# Lombicor Recruitment Portal

Full-stack recruitment portal for Railway deployment with:
- public applicant form
- Supabase-backed application storage
- admin PIN gate
- admin review and placement workflow

## Stack
- React + Vite frontend
- Node + Express backend
- Supabase database and storage
- Railway single-service deployment

## Features
- Prevent duplicate registration by SA ID number
- Area dropdown: Uitenhage, Kirkwood, Addo, Other
- Skill selection saved and shown in admin
- Admin PIN gate using `ADMIN_PIN`
- Placement options: Unifrutti, Greenco Day, Greenco Night, Freshco, Golden Ridge
- File upload support through Supabase Storage

## Env vars
Copy `.env.example` to `.env` and fill in:

```bash
PORT=3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=applicant-docs
ADMIN_PIN=2026
VITE_API_BASE_URL=
```

Notes:
- Leave `VITE_API_BASE_URL` empty for Railway same-origin hosting.
- Do not commit your real `.env` file.

## Local run
```bash
npm install
npm run build
npm run start
```

Then open `http://127.0.0.1:3000`.

For local frontend development with live reload:
```bash
npm run dev
```
- frontend: `http://127.0.0.1:5173`
- backend API: `http://127.0.0.1:3000`

## Supabase setup
Run the SQL in `docs/supabase-schema.sql`, then create a public storage bucket named `applicant-docs` or change `SUPABASE_STORAGE_BUCKET`.

## Railway deploy
Railway should build from the repo root.
- Build command: `npm run build`
- Start command: `npm run start`
- Healthcheck path: `/api/health`

Add these Railway variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `ADMIN_PIN`

Do not set `PORT` manually on Railway.

## Admin access
Open `/admin-login` and enter the PIN from `ADMIN_PIN`.
