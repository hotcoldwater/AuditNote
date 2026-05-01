alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists is_admin boolean not null default false;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (
  auth.uid() = id
  or exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.is_admin = true
  )
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

alter table public.issue_reports enable row level security;

drop policy if exists "issue_reports_select_own" on public.issue_reports;
create policy "issue_reports_select_own"
on public.issue_reports
for select
using (
  auth.uid() = user_id
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
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.is_admin = true
  )
);

alter table public.issue_reports drop constraint if exists issue_reports_target_check;
alter table public.issue_reports add constraint issue_reports_target_check check (
  (source_kind = 'STUDY' and standard_id is not null and question_id is null)
  or (source_kind = 'EXAM' and question_id is not null and standard_id is null)
);
