# SAMS (Student Activity Management System)

SAMS is a full-stack student activity tracking application.

Faculty members can log student activities and upload proof documents, while students can view their own activity history and total points.

## Features

- Role-based login for faculty and students
- Faculty dashboard to create activity logs
- Student dashboard to view personal logs and total points
- Optional PDF proof upload for each activity
- Supabase Row Level Security (RLS) on all core tables
- Storage policies for private proof access

## Tech Stack

- TanStack Start (React + SSR)
- Vite
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Postgres, Storage)
- Cloudflare Worker-ready build config (Wrangler)
- Vercel static deployment

## Project Structure

- src/routes: route pages (landing, login, faculty, student)
- src/lib: auth and utility logic
- src/integrations/supabase: Supabase client and generated types
- supabase/migrations: SQL schema and policy migrations

## Prerequisites

- Bun 1.1+ (recommended) or npm
- Supabase project
- Supabase CLI (for local DB workflows)

## Environment Variables

Create a .env file in the project root.

Client-side:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)

Server-side (for middleware/server operations):

- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY

Example:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
# Optional alias if your project uses older naming:
# VITE_SUPABASE_ANON_KEY=your_publishable_key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Setup

1. Install dependencies:

```bash
bun install
# or
npm install
```

2. Run development server:

```bash
bun run dev
# or
npm run dev
```

3. Build for production:

```bash
bun run build
# or
npm run build
```

4. Lint the codebase:

```bash
bun run lint
# or
npm run lint
```

## Supabase Database Setup

1. Apply migrations from the supabase/migrations folder.
2. Create faculty and student users in Supabase Auth.
3. Insert roles in public.user_roles.

Example role inserts:

```sql
insert into public.user_roles (user_id, role)
values
  ('<faculty-user-uuid>', 'faculty'),
  ('<student-user-uuid>', 'student');
```

Profiles are auto-created by trigger on auth.users insertion.

## Proof File Access Model

- Proof files are uploaded into the private proofs storage bucket.
- Files are stored under path format: <student_id>/<timestamp>_<filename>.pdf
- The app resolves private file references to signed URLs at read time.
- Faculty can read all proof files.
- Students can read only proof files inside their own folder.

## Authors

1. Nithila K - RA2411003040029
2. Sandhya Dillybabu - RA2411003040080

## Deployment Notes

Wrangler is configured with worker name sams in wrangler.jsonc.

Typical deploy flow:

```bash
bun run build
bunx wrangler deploy
```

Make sure Cloudflare and environment secrets are configured before deployment.

## Vercel Deployment

This repository includes a Vercel-ready configuration in vercel.json.

### Build behavior

- Vercel runs npm run build:vercel
- Output directory is dist/client
- SPA rewrites are configured so /login, /student, /faculty, and /leaderboard resolve correctly

### Environment variables in Vercel

Set these in Vercel Project Settings > Environment Variables:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_SUPABASE_PROJECT_ID (optional but recommended)

### Deploy steps

1. Push to GitHub
2. Import repository into Vercel
3. Add environment variables
4. Deploy

Tip: For local parity, copy .env.example to .env and fill values.
