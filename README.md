# Study Buddy

Year 8 study platform: lessons, quizzes, and progress tracking. Learn, practice, and improve.

## Features

- **Student**: View subjects → topics → lessons, take topic quizzes, track progress.
- **Parent**: Link to your child’s account and view progress (lessons completed, quiz scores, weak topics).
- **Admin**: Add subjects, topics, lessons, and questions (no code changes needed for custom subjects like Edo Language).

## Tech stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend / DB / Auth**: Supabase (Postgres, Auth, RLS)
- **Hosting**: Vercel (or run locally)

## Setup (dev, minimal cost)

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Settings → API**, copy:
   - Project URL
   - `anon` (public) key
3. In **SQL Editor**, run the entire contents of `supabase/schema.sql`. This creates tables, RLS, trigger, and seed data (Mathematics & English with sample topics/lessons/questions).
4. **Avoid “Email rate limit exceeded” (dev):** Supabase sends a confirmation email on each signup and limits this to about 2 per hour. For development, turn this off so signups don’t send email: go to **Authentication → Providers → Email** and **disable “Confirm email”**. New users can then sign in right after signup without confirming.

### 2. Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key  

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
