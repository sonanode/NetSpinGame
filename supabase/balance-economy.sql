-- Optional: apply tuned economy + jackpot seeds (run once in SQL Editor)

alter table public.profiles
  alter column active_lines set default 40;

alter table public.profiles
  alter column jackpots set default '{"mini":500,"minor":2500,"major":12000,"mega":50000}'::jsonb;

update public.profiles
set jackpots = '{"mini":500,"minor":2500,"major":12000,"mega":50000}'::jsonb
where jackpots = '{}'::jsonb
   or jackpots is null
   or coalesce((jackpots->>'mega')::int, 0) = 0;

-- Restore international 40-line default for accounts saved as 20
update public.profiles set active_lines = 40 where active_lines < 40;
