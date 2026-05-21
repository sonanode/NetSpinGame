-- Optional: apply tuned economy + jackpot seeds (run once in SQL Editor)

alter table public.profiles
  alter column active_lines set default 20;

alter table public.profiles
  alter column jackpots set default '{"mini":500,"minor":2500,"major":12000,"mega":50000}'::jsonb;

update public.profiles
set jackpots = '{"mini":500,"minor":2500,"major":12000,"mega":50000}'::jsonb
where jackpots = '{}'::jsonb
   or jackpots is null
   or coalesce((jackpots->>'mega')::int, 0) = 0;

-- Soft-cap players still on 40 lines to 20 (remove this line if you want to keep 40)
-- update public.profiles set active_lines = 20 where active_lines > 20;
