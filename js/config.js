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
  bigWinMultiplier: 25,
};

export const SPIN_TIMING = {
  firstReelMs: 2400,
  staggerPerReelMs: 450,
  frameIntervalMs: 48,
  autoFactor: 0.8,
  postStopPauseMs: 320,
};

export function symbolImgUrl(sym) {
  return new URL(`../assets/symbols/${sym.file}`, import.meta.url).href;
}
