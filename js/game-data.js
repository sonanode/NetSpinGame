/** Game math (browser) — same rules as server slot-logic */

export const WILD_ID = 6;
export const SCATTER_ID = 10;
export const BONUS_ID = 11;
export const USE_WILD = true;
export const USE_WILD_IN_FIRST = false;
export const COLS = 5;
export const ROWS = 4;
export const MAX_WIN_TIMES_BET = 40;

export const PAYLINE_PATHS = [
  [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [0, 0, 0, 0, 0], [3, 3, 3, 3, 3],
  [0, 1, 2, 1, 0], [3, 2, 1, 2, 3], [1, 0, 0, 0, 1], [2, 3, 3, 3, 2],
  [0, 1, 1, 1, 0], [3, 2, 2, 2, 3], [1, 2, 2, 2, 1], [2, 1, 1, 1, 2],
  [1, 0, 1, 0, 1], [2, 3, 2, 3, 2], [0, 1, 0, 1, 0], [3, 2, 3, 2, 3],
  [1, 2, 1, 2, 1], [2, 1, 2, 1, 2], [0, 0, 1, 2, 3], [3, 3, 2, 1, 0],
  [1, 1, 0, 1, 1], [2, 2, 3, 2, 2], [0, 1, 2, 3, 3], [3, 2, 1, 0, 0],
  [1, 0, 1, 2, 3], [2, 3, 2, 1, 0], [0, 1, 2, 3, 2], [3, 2, 1, 0, 1],
  [1, 2, 3, 2, 1], [2, 1, 0, 1, 2], [0, 2, 0, 2, 0], [3, 1, 3, 1, 3],
  [1, 3, 1, 3, 1], [2, 0, 2, 0, 2], [0, 3, 0, 3, 0], [3, 0, 3, 0, 3],
  [1, 1, 2, 1, 1], [2, 2, 1, 2, 2], [0, 2, 1, 2, 0], [3, 1, 2, 1, 3],
];

export const BASE_PAYTABLE = [
  { line: [2, 2, 2, -1, -1], pay: 0, freeSpins: 0 },
  { line: [2, 2, 2, 2, -1], pay: 1, freeSpins: 0 },
  { line: [2, 2, 2, 2, 2], pay: 2, freeSpins: 0 },
  { line: [1, 1, 1, -1, -1], pay: 0, freeSpins: 0 },
  { line: [1, 1, 1, 1, -1], pay: 1, freeSpins: 0 },
  { line: [1, 1, 1, 1, 1], pay: 3, freeSpins: 0 },
  { line: [4, 4, 4, -1, -1], pay: 0, freeSpins: 0 },
  { line: [4, 4, 4, 4, -1], pay: 2, freeSpins: 0 },
  { line: [4, 4, 4, 4, 4], pay: 4, freeSpins: 0 },
  { line: [9, 9, 9, -1, -1], pay: 0, freeSpins: 0 },
  { line: [9, 9, 9, 9, -1], pay: 2, freeSpins: 0 },
  { line: [9, 9, 9, 9, 9], pay: 5, freeSpins: 0 },
  { line: [5, 5, 5, -1, -1], pay: 2, freeSpins: 0 },
  { line: [5, 5, 5, 5, -1], pay: 5, freeSpins: 0 },
  { line: [5, 5, 5, 5, 5], pay: 8, freeSpins: 0 },
  { line: [0, 0, 0, -1, -1], pay: 3, freeSpins: 0 },
  { line: [0, 0, 0, 0, -1], pay: 5, freeSpins: 0 },
  { line: [0, 0, 0, 0, 0], pay: 10, freeSpins: 0 },
  { line: [3, 3, 3, -1, -1], pay: 3, freeSpins: 0 },
  { line: [3, 3, 3, 3, -1], pay: 6, freeSpins: 0 },
  { line: [3, 3, 3, 3, 3], pay: 11, freeSpins: 0 },
  { line: [8, 8, 8, -1, -1], pay: 3, freeSpins: 0 },
  { line: [8, 8, 8, 8, -1], pay: 6, freeSpins: 0 },
  { line: [8, 8, 8, 8, 8], pay: 12, freeSpins: 0 },
  { line: [7, 7, 7, -1, -1], pay: 0, freeSpins: 2 },
  { line: [7, 7, 7, 7, -1], pay: 0, freeSpins: 4 },
  { line: [7, 7, 7, 7, 7], pay: 0, freeSpins: 6 },
  { line: [6, 6, 6, 6, 6], pay: 22, freeSpins: 0 },
  { line: [11, 11, 11, -1, -1], pay: 1, freeSpins: 0, mult: 2 },
  { line: [11, 11, 11, 11, -1], pay: 4, freeSpins: 0, mult: 2 },
  { line: [11, 11, 11, 11, 11], pay: 0, freeSpins: 0, mult: 2 },
];

export const SCATTER_PAYTABLE = [
  { count: 3, pay: 1, freeSpins: 3, mult: 2 },
  { count: 4, pay: 4, freeSpins: 5, mult: 2 },
  { count: 5, pay: 12, freeSpins: 8, mult: 2 },
];

function decodeSymbOrder(hex) {
  const out = [];
  for (let i = 0; i < hex.length; i += 8) {
    const chunk = hex.slice(i, i + 8);
    if (chunk.length < 8) break;
    const b = chunk.match(/../g);
    out.push(parseInt(b.reverse().join(''), 16));
  }
  return out;
}

export const REEL_STRIPS = [
  decodeSymbOrder(
    '080000000700000006000000090000000a0000000100000004000000020000000600000004000000060000000500000009000000060000000000000003000000080000000000000006000000060000000000000006000000'
  ),
  decodeSymbOrder(
    '0400000003000000000000000700000005000000020000000800000009000000000000000a00000000000000010000000600000000000000000000000300000000000000'
  ),
  decodeSymbOrder(
    '00000000070000000100000002000000030000000a0000000600000008000000090000000900000008000000040000000500000006000000000000000600000002000000000000000600000005000000'
  ),
  decodeSymbOrder(
    '000000000700000001000000020000000300000005000000040000000a000000080000000000000009000000000000000100000006000000000000000000000006000000'
  ),
  decodeSymbOrder(
    '0000000001000000020000000300000004000000070000000a0000000500000008000000060000000a00000001000000090000000800000006000000000000000600000000000000'
  ),
];

export const JACKPOT_CFG = {
  mini: { label: 'MINI', seed: 500, contrib: 0.012, odds: 0.0012 },
  minor: { label: 'MINOR', seed: 2500, contrib: 0.015, odds: 0.0005 },
  major: { label: 'MAJOR', seed: 12000, contrib: 0.018, odds: 0.00015 },
  mega: { label: 'MEGA', seed: 50000, contrib: 0.022, odds: 0.000025 },
};

export const FREE_SPIN_START_MULT = 2;
export const FREE_SPIN_MULT_CAP = 5;
