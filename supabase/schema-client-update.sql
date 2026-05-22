-- Run once if balance does not save after spin (local game mode)
-- Allows logged-in user to update own profile

drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid () = id)
with check (auth.uid () = id);
