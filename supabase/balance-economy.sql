-- Optional: apply tuned economy to existing players (run once)

alter table public.profiles
  alter column active_lines set default 20;

-- Soft-cap players still on 40 lines to 20 (remove this line if you want to keep 40)
-- update public.profiles set active_lines = 20 where active_lines > 20;
