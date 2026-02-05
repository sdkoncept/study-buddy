# Study Buddy

Year 8 study platform: lessons, quizzes, and progress tracking. Learn, practice, and improve.

## Features

- **Student**: View subjects → topics → lessons, take topic quizzes, track progress.
- **Parent**: Link to your child’s account and view progress (lessons completed, quiz scores, weak topics).
- **Admin**: Add subjects, topics, lessons, and questions (no code changes needed for custom subjects like Edo Language).

## Tech stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend / DB / Auth**: Supabase (Postgres, Auth, RLS)
- **Hosting**: Vercel (recommended), Railway, or run locally

## Deploy on Vercel (recommended)

Vercel is built for Next.js and usually works with zero extra config.

1. **Sign in** at [vercel.com](https://vercel.com) with GitHub.
2. **Import** your repo: **Add New → Project** → select your Study Buddy repo → **Import**.
3. **Environment variables** — Before deploying, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL  
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key  
   (Project → **Settings → Environment Variables**; add for Production, Preview, and Development if you use Vercel previews.)
4. **Deploy** — Vercel will detect Next.js, run `npm run build`, and serve the app. No `railway.json`, PORT, or Node version config needed.
5. **Optional:** In Supabase **Authentication → URL Configuration**, add your Vercel URL to **Redirect URLs** (e.g. `https://your-app.vercel.app/**`) so auth redirects work.

## Deploy on Railway

1. **Connect** your GitHub repo to a new Railway project.
2. **Environment variables** — In Railway → your service → **Variables**, add (required for build and runtime):
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key  
   These are embedded at build time; if missing, the app may build but fail at runtime.
3. **Build / start** — The repo includes `railway.json` so Railway will:
   - Use **Railpack** (default builder), run `npm run build`, and start with `npx next start --port $PORT`.
   - Use Node 20 (from `.nvmrc` and `.node-version`). If the build still uses Node 18, add variable `RAILPACK_NODE_VERSION` = `20` in Railway.
4. **If deployment fails:**
   - **Build fails (Node / Supabase warnings):** Add variable `RAILPACK_NODE_VERSION` = `20` (or `NODE_VERSION` = `20` in service settings). Clear build cache and redeploy.
   - **Build succeeds but app won't start / "No start command":** The repo's `railway.json` sets `startCommand` to `npx next start --port $PORT`. If you overrode the start command in the dashboard, remove it so the file is used, or set it to `npx next start --port $PORT`.
   - **Repo or folder name has a space:** If the repo is named with a space (e.g. "study buddy"), clone or deploy from a path without spaces, or rename the repo to use a hyphen (e.g. `study-buddy`) to avoid path issues in the build.
   - **Out of memory during build:** In Railway service settings, try increasing memory if available.
   - **"Cannot create code snapshot right now":** This is a Railway platform error (their snapshot service). Try: (1) wait a few minutes and **Redeploy** from the Railway dashboard; (2) push a small new commit (e.g. empty or a README tweak) to trigger a fresh deploy; (3) in Railway → project → **Settings**, try **Disconnect** then **Reconnect** the GitHub repo; (4) check [Railway status](https://status.railway.app/) for incidents. If it persists, contact Railway support.

## Setup (dev, minimal cost)

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Settings → API**, copy:
   - Project URL
   - `anon` (public) key
3. In **SQL Editor**, run the entire contents of `supabase/schema.sql`. This creates tables, RLS, trigger, and seed data (Mathematics & English with sample topics/lessons/questions).
4. **Optional migrations** (if your DB was created from an older schema): run `supabase/add-topics-week-range.sql`, `supabase/add-lessons-image-urls.sql`, `supabase/add-question-type-external-answer.sql` (for "answer outside platform" questions), and `supabase/add-external-answer-grades.sql` (for teachers/admins to upload student work and score those questions).
5. **PDF notes and question images:** Create a Storage bucket: **Storage → New bucket** → name `lesson-images`, set to **Public**. Run `supabase/storage-lesson-images-policies.sql` in the SQL Editor so admins can upload (PDF pages, question images). Without these policies you’ll get "new row violates row-level security policy" on upload.
6. **Avoid “Email rate limit exceeded” (dev):** Supabase sends a confirmation email on each signup and limits this to about 2 per hour. For development, turn this off so signups don’t send email: go to **Authentication → Providers → Email** and **disable “Confirm email”**. New users can then sign in right after signup without confirming.

### 2. Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key  
- `GROQ_API_KEY` = your Groq API key (optional, for AI study help; get a free key at [console.groq.com](https://console.groq.com/keys))  

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. First users

- **Sign up** with role **Student** or **Parent** or **Admin**.
- As **Admin**: go to **Admin → Subjects** to add/edit subjects, topics, lessons, and questions.
- As **Student**: go to **Dashboard → View subjects** to study and take quizzes.
- As **Parent**: go to **My children**, enter your child’s Study Buddy email, then **Link** to see their progress.

## Project structure

- `app/` — Next.js App Router (pages, layouts, API routes)
- `app/dashboard/` — Student dashboard (subjects, topics, lesson + quiz)
- `app/parent/` — Parent dashboard (link students, view progress)
- `app/admin/` — Admin (subjects, topics, lessons, questions CRUD)
- `lib/` — Supabase client, auth helpers, types
- `supabase/schema.sql` — Full DB schema and seed (run once in Supabase SQL Editor)

## Parent features (goals, messages)

Run **`supabase/parent-features.sql`** in Supabase SQL Editor once to add:

- **Parent goals** — Set how many topics the child should complete per week (shown on the child’s dashboard).
- **Parent messages** — Send a short message to the child (shown on the child’s dashboard).

## Troubleshooting

- **Parent can sign in (Auth works) but gets sent back to login:** Run in Supabase **SQL Editor** (in order):
  1. `supabase/ensure-profile-function.sql` — creates a function that ensures every logged-in user has a profile.
  2. `supabase/backfill-missing-profiles.sql` — creates profiles for any existing auth users who don’t have one.
  Then have the parent try signing in again.

- **“No account found with that email” when linking a child:** Run `supabase/fix-parent-link-student.sql` in Supabase SQL Editor so parents can look up students by email.
- **“Your account has no profile” or infinite recursion (42P17) when parent links:** Run `supabase/fix-rls-infinite-recursion.sql` in Supabase SQL Editor to fix the RLS policy that caused recursion.

## Custom subjects (e.g. Edo Language)

1. As Admin: **Admin → Subjects → Add subject**.
2. Set name (e.g. “Edo Language”), class level, term; check **Custom subject**.
3. Add topics and lessons; use **Audio URL** in lessons for pronunciation.
4. Add questions for topic quizzes.

No code changes required.
# study-buddy
