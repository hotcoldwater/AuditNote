drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (
  auth.uid() = id
  or coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false)
);

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
