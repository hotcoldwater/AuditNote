create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nickname text,
  created_at timestamptz not null default now()
);

create table if not exists public.standards (
  id text primary key,
  content_type text,
  source_ref text,
  part_no integer,
  chapter_no integer,
  section_no integer,
  topic_no integer,
  paren_no integer,
  bracket_no integer,
  item_no integer,
  title text not null,
  answer text not null,
  level integer not null,
  exam_years text[] not null default '{}',
  required_keywords text[] not null default '{}',
  optional_keywords text[] not null default '{}',
  tags text[] not null default '{}',
  is_active boolean not null default true,
  check_status text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  standard_id text not null references public.standards(id),
  mode text not null,
  user_answer text,
  score numeric not null,
  result_status text not null,
  grading_method text,
  grading_model text,
  ai_reason text,
  should_add_wrong_note boolean,
  raw_grading_result jsonb,
  included_required_keywords text[] not null default '{}',
  missing_required_keywords text[] not null default '{}',
  included_optional_keywords text[] not null default '{}',
  answer_length_ratio numeric,
  similarity_score numeric,
  created_at timestamptz not null default now()
);

alter table public.study_attempts add column if not exists grading_method text;
alter table public.study_attempts add column if not exists grading_model text;
alter table public.study_attempts add column if not exists ai_reason text;
alter table public.study_attempts add column if not exists should_add_wrong_note boolean;
alter table public.study_attempts add column if not exists raw_grading_result jsonb;

create table if not exists public.user_standard_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  standard_id text not null references public.standards(id),
  attempt_count integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  review_count integer not null default 0,
  skipped_count integer not null default 0,
  last_score numeric,
  last_result_status text,
  consecutive_correct_count integer not null default 0,
  consecutive_wrong_count integer not null default 0,
  last_attempted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, standard_id)
);

create table if not exists public.wrong_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  standard_id text not null references public.standards(id),
  source text not null default 'AUTO',
  reason text,
  is_resolved boolean not null default false,
  wrong_count integer not null default 1,
  last_attempted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, standard_id)
);

create index if not exists idx_study_attempts_user_created_at on public.study_attempts (user_id, created_at desc);
create index if not exists idx_user_standard_stats_user on public.user_standard_stats (user_id);
create index if not exists idx_wrong_notes_user_resolved on public.wrong_notes (user_id, is_resolved);

drop trigger if exists trg_standards_updated_at on public.standards;
create trigger trg_standards_updated_at
before update on public.standards
for each row
execute function public.set_updated_at();

drop trigger if exists trg_user_standard_stats_updated_at on public.user_standard_stats;
create trigger trg_user_standard_stats_updated_at
before update on public.user_standard_stats
for each row
execute function public.set_updated_at();

drop trigger if exists trg_wrong_notes_updated_at on public.wrong_notes;
create trigger trg_wrong_notes_updated_at
before update on public.wrong_notes
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.standards enable row level security;
alter table public.study_attempts enable row level security;
alter table public.user_standard_stats enable row level security;
alter table public.wrong_notes enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "standards_select_authenticated" on public.standards;
create policy "standards_select_authenticated"
on public.standards
for select
using (auth.role() = 'authenticated');

drop policy if exists "study_attempts_select_own" on public.study_attempts;
create policy "study_attempts_select_own"
on public.study_attempts
for select
using (auth.uid() = user_id);

drop policy if exists "study_attempts_insert_own" on public.study_attempts;
create policy "study_attempts_insert_own"
on public.study_attempts
for insert
with check (auth.uid() = user_id);

drop policy if exists "study_attempts_delete_own" on public.study_attempts;
create policy "study_attempts_delete_own"
on public.study_attempts
for delete
using (auth.uid() = user_id);

drop policy if exists "user_standard_stats_select_own" on public.user_standard_stats;
create policy "user_standard_stats_select_own"
on public.user_standard_stats
for select
using (auth.uid() = user_id);

drop policy if exists "user_standard_stats_insert_own" on public.user_standard_stats;
create policy "user_standard_stats_insert_own"
on public.user_standard_stats
for insert
with check (auth.uid() = user_id);

drop policy if exists "user_standard_stats_update_own" on public.user_standard_stats;
create policy "user_standard_stats_update_own"
on public.user_standard_stats
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "wrong_notes_select_own" on public.wrong_notes;
create policy "wrong_notes_select_own"
on public.wrong_notes
for select
using (auth.uid() = user_id);

drop policy if exists "wrong_notes_insert_own" on public.wrong_notes;
create policy "wrong_notes_insert_own"
on public.wrong_notes
for insert
with check (auth.uid() = user_id);

drop policy if exists "wrong_notes_update_own" on public.wrong_notes;
create policy "wrong_notes_update_own"
on public.wrong_notes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
