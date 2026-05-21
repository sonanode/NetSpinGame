# Neon Vegas — Web Slot (4×5)

Browser slot **4 rows × 5 columns**, **40 paylines**, progressive jackpots, bet/win multipliers, free spins. Uses MK Modern Neon Casino Kit sprites + WAV sounds.

## Run locally

ES modules and image paths require a local server (not `file://`).

```bash
cd web-mini-slot
npx --yes serve . -p 3456
```

Open: http://localhost:3456

Or from project root:

```bash
npx --yes serve "web-mini-slot" -p 3456
```

## Features

- **4×5** reels, **40 paylines**
- **Bet multiplier** ×1 / ×2 / ×3 / ×5 / ×10
- **Win multiplier** (Scatter/Bonus + rising during free spins up to ×10)
- **Free spins** (Scatter + FreeSpin symbol lines)
- **Progressive jackpots** — Mini / Minor / Major / Mega
- **Kit WAV audio** — Background, spin loop, win, coins, big win, bonus, button, choose, buy, reel stop; Neon BG during free spins
- Auto spin, MAX BET, Big Win / Jackpot overlays

## Assets

Sprites load from:

`../Assets/ModernNeonCasinoKit/1b_ModernSuitsSlot/Sprites_Modern/Game Screen/Symbols/`

Keep this folder next to `web-mini-slot` when deploying.

## Asset browser (images & templates)

- **http://localhost:3456/web-mini-slot/asset-preview.html**
- 480 PNG sprites/UI, 20 Unity scenes, 141 prefabs
- Regenerate list: `powershell -File web-mini-slot/generate-asset-manifest.ps1`

## Sound preview

- **http://localhost:3456/web-mini-slot/sound-preview.html** — 12 WAV files

## Entertainment only

No real money. For demo / portfolio use.
