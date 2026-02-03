-- Study Buddy — run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Enable UUID extension if not already
create extension if not exists "uuid-ossp";

-- Profiles: one per auth user, stores role and display info
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null check (role in ('student', 'parent', 'admin')),
  parent_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Students linked to parent (parent sees these children)
create table public.parent_students (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  primary key (parent_id, student_id),
  created_at timestamptz default now()
);

-- Subjects (e.g. Mathematics, English, Edo Language)
create table public.subjects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  class_level text not null default 'Year 8',
  term text not null check (term in ('First', 'Second', 'Third')),
  description text,
  is_custom boolean default false,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Topics under a subject (week_range from PDF scheme of work allows same subject uploaded multiple times with different weeks)
create table public.topics (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  week_range text,
  learning_objectives text,
  estimated_study_time_minutes int default 15,
  difficulty_level text check (difficulty_level in ('Easy', 'Medium', 'Hard')),
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Lessons under a topic (text, optional image/audio URLs; image_urls from PDF upload)
create table public.lessons (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  title text not null,
  content text not null,
  image_url text,
  image_urls jsonb default '[]'::jsonb,
  audio_url text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Questions (linked to topic; multiple_choice or short_answer; explanation shown after answer)
create table public.questions (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'multiple_choice' check (question_type in ('multiple_choice', 'short_answer')),
  options jsonb not null default '[]'::jsonb,
  correct_index int not null default 0,
  correct_indices jsonb default '[]'::jsonb,
  correct_answer_text text,
  explanation text,
  difficulty_level text check (difficulty_level in ('Easy', 'Medium', 'Hard')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Progress: lesson completed or topic “completed” (e.g. quiz passed)
create table public.lesson_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz default now(),
  time_spent_seconds int default 0,
  unique(user_id, lesson_id)
);

-- Quiz attempts (topic quiz for now)
create table public.quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  score_percent numeric(5,2) not null,
  answers_json jsonb, -- [{ questionId, selectedIndex }]
  created_at timestamptz default now()
);

-- RLS: enable
alter table public.profiles enable row level security;
alter table public.parent_students enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.lessons enable row level security;
alter table public.questions enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;

-- Profiles: users see own profile; admins see all
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Parent can read linked students' profiles
create policy "Parents can read linked students" on public.profiles
  for select using (
    exists (
      select 1 from public.parent_students ps
      where ps.parent_id = auth.uid() and ps.student_id = id
    )
  );

-- Helper to avoid RLS recursion: is current user a parent? (SECURITY DEFINER reads profiles)
create or replace function public.is_parent()
returns boolean language sql security definer set search_path = public stable
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'parent'); $$;

-- Parent can look up any student by email (for linking; only id/role needed)
create policy "Parents can look up students by email for linking" on public.profiles
  for select using (public.is_parent() and role = 'student');

-- Parent_students: parent manages own links
create policy "Parents can manage own links" on public.parent_students
  for all using (parent_id = auth.uid());

-- Subjects, topics, lessons, questions: all authenticated can read; only admin can write
create policy "Authenticated read subjects" on public.subjects for select to authenticated using (true);
create policy "Admin insert subjects" on public.subjects for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admin update subjects" on public.subjects for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admin delete subjects" on public.subjects for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Authenticated read topics" on public.topics for select to authenticated using (true);
create policy "Admin manage topics" on public.topics for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Authenticated read lessons" on public.lessons for select to authenticated using (true);
create policy "Admin manage lessons" on public.lessons for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Authenticated read questions" on public.questions for select to authenticated using (true);
create policy "Admin manage questions" on public.questions for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Lesson progress: students write own; students and their parents can read
create policy "Students can manage own lesson progress" on public.lesson_progress
  for all using (user_id = auth.uid());
create policy "Parents can read linked students progress" on public.lesson_progress
  for select using (
    exists (select 1 from public.parent_students ps where ps.parent_id = auth.uid() and ps.student_id = user_id)
  );

-- Quiz attempts: same idea
create policy "Students can manage own quiz attempts" on public.quiz_attempts
  for all using (user_id = auth.uid());
create policy "Parents can read linked students attempts" on public.quiz_attempts
  for select using (
    exists (select 1 from public.parent_students ps where ps.parent_id = auth.uid() and ps.student_id = user_id)
  );

-- Trigger: create profile on signup (run after auth.users insert)
-- Use Supabase Dashboard: Authentication → Triggers, or run this function + trigger:
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, new.raw_user_meta_data->>'email'),
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Run in SQL once (Supabase creates auth.users in auth schema):
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed: two default subjects and sample topic/lesson/questions for Year 8
insert into public.subjects (name, class_level, term, description, sort_order) values
  ('Mathematics', 'Year 8', 'First', 'Number, algebra, and geometry basics.', 1),
  ('English', 'Year 8', 'First', 'Grammar, comprehension, and composition.', 2);

-- Get subject IDs for seed (use actual UUIDs from subjects after insert, or use name)
do $$
declare
  math_id uuid;
  eng_id uuid;
  t_id uuid;
  l_id uuid;
begin
  select id into math_id from public.subjects where name = 'Mathematics' limit 1;
  select id into eng_id from public.subjects where name = 'English' limit 1;

  insert into public.topics (subject_id, title, learning_objectives, estimated_study_time_minutes, difficulty_level, sort_order)
  values (math_id, 'Introduction to Algebra', 'Understand variables and simple equations.', 15, 'Easy', 1)
  returning id into t_id;

  insert into public.lessons (topic_id, title, content, sort_order)
  values (t_id, 'What is a variable?', 'A variable is a letter that stands for a number we do not know yet. For example, in x + 5 = 12, x is the variable. We can find x by subtracting 5 from both sides: x = 7.', 1);

  insert into public.questions (topic_id, question_text, options, correct_index, explanation)
  values
    (t_id, 'In the equation 3 + y = 10, what is y?', '["4", "5", "6", "7"]', 3, 'Subtract 3 from both sides: y = 10 - 3 = 7.'),
    (t_id, 'If x - 4 = 6, then x equals?', '["2", "8", "10", "24"]', 2, 'Add 4 to both sides: x = 6 + 4 = 10.');

  insert into public.topics (subject_id, title, learning_objectives, estimated_study_time_minutes, difficulty_level, sort_order)
  values (eng_id, 'Parts of Speech', 'Identify nouns, verbs, and adjectives.', 15, 'Easy', 1)
  returning id into t_id;

  insert into public.lessons (topic_id, title, content, sort_order)
  values (t_id, 'Nouns and Verbs', 'A noun is a naming word: person, place, or thing. A verb is a doing word: run, think, be. In "The dog runs", "dog" is a noun and "runs" is a verb.', 1);

  insert into public.questions (topic_id, question_text, options, correct_index, explanation)
  values
    (t_id, 'Which word is a noun in: "The cat sat on the mat"?', '["The", "cat", "sat", "on"]', 1, '"Cat" names a thing, so it is a noun.'),
    (t_id, 'Which word is a verb in: "She writes a letter"?', '["She", "writes", "a", "letter"]', 1, '"Writes" is the doing word.');
end $$;
