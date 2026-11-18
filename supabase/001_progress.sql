-- One private row of progress per signed-in user.
-- Run in the Supabase SQL editor. Safe to run again: it creates only what is missing.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint progress_size check (pg_column_size(data) < 262144)
);

alter table public.progress enable row level security;

-- Only signed-in users can reach the table at all. Visitors who are not signed in get nothing.
revoke all on public.progress from anon;
grant select, insert, update, delete on public.progress to authenticated;

-- Each person can see and change only their own row. The database enforces this, not the web page.
drop policy if exists "read own"   on public.progress;
drop policy if exists "insert own" on public.progress;
drop policy if exists "update own" on public.progress;
drop policy if exists "delete own" on public.progress;
create policy "read own"   on public.progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own" on public.progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own" on public.progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own" on public.progress for delete to authenticated using ((select auth.uid()) = user_id);
