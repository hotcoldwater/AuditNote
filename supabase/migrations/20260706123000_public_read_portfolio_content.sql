drop policy if exists "standards_select_authenticated" on public.standards;
drop policy if exists "standards_select_public" on public.standards;
create policy "standards_select_public"
on public.standards
for select
using (auth.role() in ('authenticated', 'anon'));

drop policy if exists "exam_questions_select_authenticated" on public.exam_questions;
drop policy if exists "exam_questions_select_public" on public.exam_questions;
create policy "exam_questions_select_public"
on public.exam_questions
for select
using (auth.role() in ('authenticated', 'anon'));
