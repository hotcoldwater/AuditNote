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
  full_name text,
  birth_date date,
  gender text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists is_admin boolean not null default false;

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
  wrong_concepts text[] not null default '{}',
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
  last_user_answer text,
  last_attempted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, standard_id)
);

alter table public.user_standard_stats add column if not exists last_user_answer text;

create table if not exists public.wrong_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  standard_id text not null references public.standards(id),
  source text not null default 'AUTO',
  note_status text not null default 'WRONG',
  reason text,
  is_resolved boolean not null default false,
  wrong_count integer not null default 1,
  last_attempted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, standard_id)
);

alter table public.standards add column if not exists wrong_concepts text[] not null default '{}';
alter table public.wrong_notes add column if not exists note_status text not null default 'WRONG';

create table if not exists public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  standard_id text references public.standards(id),
  report_type text not null,
  result_status text,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_study_attempts_user_created_at on public.study_attempts (user_id, created_at desc);
create index if not exists idx_user_standard_stats_user on public.user_standard_stats (user_id);
create index if not exists idx_wrong_notes_user_resolved on public.wrong_notes (user_id, is_resolved);
create index if not exists idx_issue_reports_user_created_at on public.issue_reports (user_id, created_at desc);

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
alter table public.issue_reports enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (
  auth.uid() = id
  or coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false)
);

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

drop policy if exists "issue_reports_select_own" on public.issue_reports;
create policy "issue_reports_select_own"
on public.issue_reports
for select
using (
  auth.uid() = user_id
  or coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false)
  or exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.is_admin = true
  )
);

drop policy if exists "issue_reports_insert_own" on public.issue_reports;
create policy "issue_reports_insert_own"
on public.issue_reports
for insert
with check (auth.uid() = user_id);

drop policy if exists "issue_reports_update_admin" on public.issue_reports;
create policy "issue_reports_update_admin"
on public.issue_reports
for update
using (
  coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false)
  or exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.is_admin = true
  )
)
with check (
  coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false)
  or exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.is_admin = true
  )
);

create table if not exists public.exam_questions (
  id text primary key,
  content_type text,
  part_no integer not null,
  chapter_no integer not null,
  section_no integer,
  problem_no integer,
  exam_year_raw text,
  exam_round text,
  exam_variant text,
  exam_years text[] not null default '{}',
  source_page text,
  part_title text not null,
  chapter_title text not null,
  section_title text,
  question_text text not null,
  answer_text text not null,
  explanation_text text,
  required_keywords text[] not null default '{}',
  optional_keywords text[] not null default '{}',
  is_active boolean not null default true,
  check_status text not null default 'DRAFT',
  note text,
  review_status text check (review_status in ('VERIFIED', 'NEEDS_REVIEW')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.issue_reports add column if not exists source_kind text not null default 'STUDY';
alter table public.issue_reports alter column standard_id drop not null;
alter table public.issue_reports add column if not exists question_id text references public.exam_questions(id);
alter table public.issue_reports add column if not exists is_resolved boolean not null default false;
alter table public.issue_reports add column if not exists resolved_at timestamptz;
alter table public.issue_reports add column if not exists resolved_by uuid references auth.users(id) on delete set null;

create index if not exists idx_issue_reports_source_kind_created_at
on public.issue_reports (source_kind, created_at desc);

create index if not exists idx_issue_reports_resolved_created_at
on public.issue_reports (is_resolved, created_at desc);

alter table public.issue_reports drop constraint if exists issue_reports_target_check;
alter table public.issue_reports add constraint issue_reports_target_check check (
  (source_kind = 'STUDY' and standard_id is not null and question_id is null)
  or (source_kind = 'EXAM' and question_id is not null and standard_id is null)
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null references public.exam_questions(id) on delete cascade,
  user_answer text not null default '',
  score integer not null,
  result_status text not null,
  grading_method text,
  grading_model text,
  ai_summary text,
  raw_grading_result jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_exam_questions_part_chapter on public.exam_questions (part_no, chapter_no);
create index if not exists idx_exam_attempts_user_created_at on public.exam_attempts (user_id, created_at desc);
create index if not exists idx_exam_attempts_user_question_created_at on public.exam_attempts (user_id, question_id, created_at desc);

drop trigger if exists trg_exam_questions_updated_at on public.exam_questions;
create trigger trg_exam_questions_updated_at
before update on public.exam_questions
for each row
execute function public.set_updated_at();

alter table public.exam_questions enable row level security;
alter table public.exam_attempts enable row level security;

drop policy if exists "exam_questions_select_authenticated" on public.exam_questions;
create policy "exam_questions_select_authenticated"
on public.exam_questions
for select
using (auth.role() = 'authenticated');

drop policy if exists "exam_questions_update_admin" on public.exam_questions;
create policy "exam_questions_update_admin"
on public.exam_questions
for update
using (
  coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false)
  or exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.is_admin = true
  )
)
with check (
  coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false)
  or exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.is_admin = true
  )
);

drop policy if exists "exam_attempts_select_own" on public.exam_attempts;
create policy "exam_attempts_select_own"
on public.exam_attempts
for select
using (auth.uid() = user_id);

drop policy if exists "exam_attempts_insert_own" on public.exam_attempts;
create policy "exam_attempts_insert_own"
on public.exam_attempts
for insert
with check (auth.uid() = user_id);
