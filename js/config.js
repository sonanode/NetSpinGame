/** Public client config — symbols & UI only (RNG/paytable on server) */

export const ASSET_BASE = 'assets/symbols';

export const SYMBOLS = [
  { id: 0, name: 'A', file: 'A.png' },
  { id: 1, name: '10', file: '10.png' },
  { id: 2, name: '9', file: '9.png' },
  { id: 3, name: 'Diamond', file: 'Diamond.png' },
  { id: 4, name: 'J', file: 'J.png' },
  { id: 5, name: 'K', file: 'K.png' },
  { id: 6, name: 'Wild', file: 'Wild.png' },
  { id: 7, name: 'FreeSpin', file: 'FreeSpin.png' },
  { id: 8, name: 'Heart', file: 'Heart.png' },
  { id: 9, name: 'Q', file: 'Q.png' },
  { id: 10, name: 'Scatter', file: 'Scatter.png' },
  { id: 11, name: 'Bonus', file: 'Bonus.png' },
];

export const COLS = 5;
export const ROWS = 4;
export const MAX_PAYLINES = 40;

export const BET_MULTIPLIERS = [1, 2, 3, 5, 10];

export const JACKPOT_LABELS = {
  mini: 'MINI',
  minor: 'MINOR',
  major: 'MAJOR',
  mega: 'MEGA',
};

export const GAME_DEFAULTS = {
  startBalance: 25000,
  maxLineBet: 20,
  defaultLineBet: 1,
  defaultActiveLines: 20,
  defaultBetMult: 1,
  bigWinMultiplier: 40,
};

/** Match server seeds in slot-logic.ts — used when DB has empty jackpots */
export const DEFAULT_JACKPOTS = {
  mini: 500,
  minor: 2500,
  major: 12000,
  mega: 50000,
};

export function mergeJackpots(stored) {
  const out = { ...DEFAULT_JACKPOTS };
  if (!stored || typeof stored !== 'object') return out;
  for (const tier of ['mini', 'minor', 'major', 'mega']) {
    const v = Number(stored[tier]);
    if (Number.isFinite(v) && v >= 0) out[tier] = v;
  }
  return out;
}

export const SPIN_TIMING = {
  firstReelMs: 2400,
  staggerPerReelMs: 450,
  frameIntervalMs: 48,
  autoFactor: 0.8,
  postStopPauseMs: 320,
};

/** Page-relative path — works on GitHub Pages (/NetSpinGame/) and local */
export function symbolImgUrl(sym) {
  return new URL(`assets/symbols/${sym.file}`, window.location.href).href;
}
