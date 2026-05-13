# Railway deployment

## 1. Add variables
Set these in Railway:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` (default: `applicant-docs`)
- `ADMIN_PIN`

Do **not** set `PORT` manually. Railway injects it, and the app already reads that injected value automatically.

## 2. Build and start
- Build: `npm run build`
- Start: `npm run start`

## 3. Health check
Use:
- `/api/health`

## 4. Supabase prep
Before first deploy:
1. Run `docs/supabase-schema.sql` in Supabase SQL editor.
2. Make sure the storage bucket exists and is public if you want public document links.

## 5. Admin access
Once deployed:
- open `/admin`
- enter the PIN from `ADMIN_PIN`
- then continue into the dashboard
