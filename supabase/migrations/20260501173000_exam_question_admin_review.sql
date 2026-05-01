alter table public.exam_questions
add column if not exists review_status text check (review_status in ('VERIFIED', 'NEEDS_REVIEW'));

alter table public.exam_questions
add column if not exists reviewed_at timestamptz;

alter table public.exam_questions
add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

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
