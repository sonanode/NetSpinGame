# Secure server-side spins

Game RNG, paytable, and balance updates run in **Supabase Edge Functions** — not in the browser.

## One-time Supabase setup

### 1) SQL

Run in SQL Editor (after `schema.sql`):

- `supabase/schema-secure.sql`

### 2) Deploy Edge Functions

Install [Supabase CLI](https://supabase.com/docs/guides/cli), then:

```powershell
cd web-mini-slot
supabase login
supabase link --project-ref tjaqcnaslxjuklaiivjs
supabase functions deploy spin
supabase functions deploy update-settings
```

Functions use `SUPABASE_SERVICE_ROLE_KEY` automatically in the cloud.

### 3) Test

Open the game → SPIN. If you see **"deploy server"** or function errors, step 2 is not done yet.

## What players can / cannot see (F12)

| Visible in browser | Hidden on server |
|--------------------|------------------|
| UI, images, sounds | Reel strips, paytable |
| Spin API request/response (grid, win amount) | Full RNG logic source |
| `guard.js` (devtools deterrent) | `supabase/functions/_shared/slot-logic.ts` |

**F12 cannot be fully blocked** — `js/guard.js` only discourages casual use.

## Client files (public)

- `js/config.js` — symbol images only
- `js/spin-api.js` — calls Edge Functions
- `js/app.js` — display + animation only

## Removed from browser

- `js/engine.js` (deleted)
