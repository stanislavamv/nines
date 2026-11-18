-- Lets a signed-in user delete their own account (and, through the foreign key, their progress row).
-- A browser cannot delete a sign-in account by itself, so this function runs with the owner's rights
-- but only ever deletes the caller: the id comes from the verified session, never from the request.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
