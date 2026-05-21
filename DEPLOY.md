# Deploy — NetSpinGame

## GitHub Pages (live)

**https://sonanode.github.io/NetSpinGame/**

Repo: https://github.com/sonanode/NetSpinGame

### Move to `NetSpinGame/NetSpinGame` organization

1. On GitHub, create an empty public repo: `NetSpinGame/NetSpinGame` (must use an account with org access).
2. In this folder:

```bash
git remote set-url origin https://github.com/NetSpinGame/NetSpinGame.git
git push -u origin master
```

3. Enable Pages: Settings → Pages → branch `master`, folder `/`.

URL will be: **https://netspingame.github.io/NetSpinGame/**

Or: GitHub → sonanode/NetSpinGame → Settings → Transfer ownership → NetSpinGame org.

## Self-contained build

`assets/symbols/`, `sounds/`, `js/` — no Unity project required on the server.

## Local run

```bash
npx serve . -p 3456
```

Open http://localhost:3456
