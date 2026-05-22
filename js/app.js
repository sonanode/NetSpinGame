import { requireSession, signOut } from './auth.js';
import { audio } from './audio.js';
import {
  BET_MULTIPLIERS,
  COLS,
  GAME_DEFAULTS,
  MAX_PAYLINES,
  mergeJackpots,
  ROWS,
  SPIN_TIMING,
  symbolImgUrl,
  SYMBOLS,
} from './config.js';
import * as playerStore from './player-store.js';
import { previewGrid, runSpin } from './local-spin.js';

const STORAGE_KEY = 'mk_neon_4x5_prefs';

const el = {
  reels: document.getElementById('reels'),
  balance: document.getElementById('balance'),
  totalBet: document.getElementById('totalBet'),
  lineBet: document.getElementById('lineBet'),
  activeLines: document.getElementById('activeLines'),
  lastWin: document.getElementById('lastWin'),
  freeSpins: document.getElementById('freeSpins'),
  winMult: document.getElementById('winMult'),
  status: document.getElementById('status'),
  spinBtn: document.getElementById('spinBtn'),
  betDown: document.getElementById('betDown'),
  betUp: document.getElementById('betUp'),
  linesDown: document.getElementById('linesDown'),
  linesUp: document.getElementById('linesUp'),
  betMultBtns: document.getElementById('betMultBtns'),
  autoBtn: document.getElementById('autoBtn'),
  maxBetBtn: document.getElementById('maxBetBtn'),
  paytableBtn: document.getElementById('paytableBtn'),
  overlay: document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlayTitle'),
  overlayBody: document.getElementById('overlayBody'),
  overlayClose: document.getElementById('overlayClose'),
  bigWin: document.getElementById('bigWin'),
  bigWinTag: document.getElementById('bigWinTag'),
  bigWinAmount: document.getElementById('bigWinAmount'),
  bigWinSub: document.getElementById('bigWinSub'),
  jackpotWin: document.getElementById('jackpotWin'),
  jpWinTag: document.getElementById('jpWinTag'),
  jpWinAmount: document.getElementById('jpWinAmount'),
  lineCanvas: document.getElementById('lineCanvas'),
  soundToggle: document.getElementById('soundToggle'),
  jpMega: document.getElementById('jpMega'),
  jpMajor: document.getElementById('jpMajor'),
  jpMinor: document.getElementById('jpMinor'),
  jpMini: document.getElementById('jpMini'),
};

const state = {
  balance: GAME_DEFAULTS.startBalance,
  lineBet: GAME_DEFAULTS.defaultLineBet,
  activeLines: GAME_DEFAULTS.defaultActiveLines,
  betMult: GAME_DEFAULTS.defaultBetMult,
  freeSpinsLeft: 0,
  sessionWinMult: 1,
  spinning: false,
  autoSpin: false,
  autoRemaining: 0,
  sound: true,
  grid: null,
  lastResult: null,
  jackpots: mergeJackpots(null),
};

function applyServerState(data) {
  if (!data) return;
  if (typeof data.balance === 'number') state.balance = data.balance;
  if (typeof data.lineBet === 'number') state.lineBet = data.lineBet;
  if (typeof data.activeLines === 'number') state.activeLines = data.activeLines;
  if (typeof data.betMult === 'number') state.betMult = data.betMult;
  if (typeof data.freeSpinsLeft === 'number') state.freeSpinsLeft = data.freeSpinsLeft;
  if (typeof data.sessionWinMult === 'number') state.sessionWinMult = data.sessionWinMult;
  if (data.jackpots) state.jackpots = mergeJackpots(data.jackpots);
}

function fmt(n) {
  return Math.floor(n).toLocaleString('en-US');
}

function totalBet() {
  return state.lineBet * state.activeLines * state.betMult;
}

function renderJackpots() {
  el.jpMini.textContent = fmt(state.jackpots.mini);
  el.jpMinor.textContent = fmt(state.jackpots.minor);
  el.jpMajor.textContent = fmt(state.jackpots.major);
  el.jpMega.textContent = fmt(state.jackpots.mega);
}

function savePrefs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ sound: state.sound }));
  playerStore.scheduleSaveSettings(state);
}

function loadPrefs() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (typeof d.sound === 'boolean') state.sound = d.sound;
  } catch (_) {}
}

async function ensureAudio() {
  audio.setEnabled(state.sound);
  await audio.unlock();
}

function updateHud() {
  el.balance.textContent = fmt(state.balance);
  el.totalBet.textContent = fmt(totalBet());
  el.lineBet.textContent = String(state.lineBet);
  el.activeLines.textContent = String(state.activeLines);
  el.freeSpins.textContent =
    state.freeSpinsLeft > 0 ? `${state.freeSpinsLeft} FREE` : '—';
  el.winMult.textContent =
    state.freeSpinsLeft > 0
      ? `×${state.sessionWinMult}`
      : state.lastResult?.effectiveMult > 1
        ? `×${state.lastResult.effectiveMult}`
        : '×1';
  if (state.autoSpin && state.spinning) {
    el.spinBtn.textContent = 'STOP';
  } else if (state.freeSpinsLeft > 0) {
    el.spinBtn.textContent = 'FREE SPIN';
  } else {
    el.spinBtn.textContent = 'SPIN';
  }
  el.spinBtn.disabled = false;
  el.spinBtn.classList.toggle('is-busy', state.spinning);
  el.spinBtn.setAttribute('aria-busy', state.spinning ? 'true' : 'false');
  const lock = state.spinning || state.freeSpinsLeft > 0;
  el.betDown.disabled = lock;
  el.betUp.disabled = lock;
  el.linesDown.disabled = lock;
  el.linesUp.disabled = lock;
  el.maxBetBtn.disabled = lock;
  el.autoBtn.classList.toggle('active', state.autoSpin);
  el.autoBtn.textContent = state.autoSpin
    ? `AUTO (${state.autoRemaining || '∞'})`
    : 'AUTO';
  document.querySelectorAll('#betMultBtns button').forEach((b) => {
    b.disabled = lock;
    b.classList.toggle('active', Number(b.dataset.mult) === state.betMult);
  });
}

function buildBetMultButtons() {
  el.betMultBtns.innerHTML = '';
  BET_MULTIPLIERS.forEach((m) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `×${m}`;
    b.dataset.mult = m;
    b.classList.toggle('active', m === state.betMult);
    b.onclick = async () => {
      await ensureAudio();
      audio.playBuy();
      state.betMult = m;
      savePrefs();
      updateHud();
    };
    el.betMultBtns.appendChild(b);
  });
}

function demoGrid() {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => Math.floor(Math.random() * SYMBOLS.length))
  );
}

function buildReels() {
  el.reels.innerHTML = '';
  for (let c = 0; c < COLS; c++) {
    const col = document.createElement('div');
    col.className = 'reel-col';
    const view = document.createElement('div');
    view.className = 'reel-view';
    for (let r = 0; r < ROWS; r++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      const img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      cell.appendChild(img);
      view.appendChild(cell);
    }
    col.appendChild(view);
    el.reels.appendChild(col);
  }
}

function setCellImage(cell, symbolId, blur = false) {
  const id = Number(symbolId);
  const sym = SYMBOLS[id] ?? SYMBOLS[0];
  const img = cell.querySelector('img');
  if (!img) return;
  const url = symbolImgUrl(sym);
  if (img.dataset.src !== url) {
    img.dataset.src = url;
    img.onerror = () => {
      const alt = new URL(
        `../assets/symbols/${sym.file}`,
        import.meta.url
      ).href;
      if (img.src !== alt) img.src = alt;
    };
    img.src = url;
  }
  img.classList.toggle('blur', blur);
}

function preloadSymbolImages() {
  SYMBOLS.forEach((sym) => {
    const im = new Image();
    im.src = symbolImgUrl(sym);
  });
}

function clearWinDisplay() {
  if (el.lineCanvas && el.reels) {
    const canvas = el.lineCanvas;
    const rect = el.reels.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
    }
  }
  el.reels?.querySelectorAll('.cell.win').forEach((cell) => {
    cell.classList.remove('win');
  });
}

function renderGrid(grid, winningCells = new Set()) {
  state.grid = grid;
  for (let c = 0; c < COLS; c++) {
    const col = el.reels.children[c];
    for (let r = 0; r < ROWS; r++) {
      const cell = col.querySelector(`.cell[data-row="${r}"]`);
      const key = `${r},${c}`;
      cell.classList.toggle('win', winningCells.has(key));
      setCellImage(cell, grid[r][c]);
    }
  }
  drawWinLines();
}

function winningCellKeys(result) {
  const set = new Set();
  if (!result || !state.grid) return set;
  for (const w of result.lineWins) {
    w.path.forEach((row, col) => set.add(`${row},${col}`));
  }
  if (result.scatterCount >= 3) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (state.grid[r][c] === 10) set.add(`${r},${c}`);
      }
    }
  }
  return set;
}

function drawWinLines() {
  const canvas = el.lineCanvas;
  const rect = el.reels.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const result = state.lastResult;
  if (!result?.lineWins?.length) return;
  const colW = rect.width / COLS;
  const rowH = rect.height / ROWS;
  result.lineWins.forEach((w, i) => {
    ctx.strokeStyle = `hsla(${280 + i * 12}, 100%, 65%, 0.95)`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#f0f';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    w.path.forEach((row, col) => {
      const x = col * colW + colW / 2;
      const y = row * rowH + rowH / 2;
      if (col === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}

function animateReels(finalGrid) {
  return new Promise((resolve) => {
    clearWinDisplay();

    const cols = [...el.reels.children];
    if (!cols.length) {
      resolve();
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      cols.forEach((c) => c.classList.remove('spinning'));
      try {
        audio.stopSpinLoop();
      } catch (_) {}
      resolve();
    };

    const speed = state.autoSpin ? SPIN_TIMING.autoFactor : 1;
    const maxMs =
      Math.round(
        (SPIN_TIMING.firstReelMs +
          (cols.length - 1) * SPIN_TIMING.staggerPerReelMs +
          SPIN_TIMING.postStopPauseMs) *
          speed
      ) + 600;
    const hardCap = setTimeout(finish, maxMs);

    try {
      audio.startSpinLoop();
    } catch (_) {}

    cols.forEach((col, ci) => {
      col.classList.add('spinning');
      const stopMs = Math.round(
        (SPIN_TIMING.firstReelMs + ci * SPIN_TIMING.staggerPerReelMs) * speed
      );
      const tick = setInterval(() => {
        for (let r = 0; r < ROWS; r++) {
          const cell = col.querySelector(`.cell[data-row="${r}"]`);
          setCellImage(cell, Math.floor(Math.random() * SYMBOLS.length), true);
        }
      }, SPIN_TIMING.frameIntervalMs);

      setTimeout(() => {
        clearInterval(tick);
        col.classList.remove('spinning');
        for (let r = 0; r < ROWS; r++) {
          setCellImage(
            col.querySelector(`.cell[data-row="${r}"]`),
            finalGrid[r][ci],
            false
          );
        }
        try {
          audio.playReelStop(ci);
        } catch (_) {}
        if (ci === cols.length - 1) {
          clearTimeout(hardCap);
          setTimeout(finish, SPIN_TIMING.postStopPauseMs);
        }
      }, stopMs);
    });
  });
}

function showBigWin(tag, amount, sub = '') {
  el.bigWinTag.textContent = tag;
  el.bigWinAmount.textContent = fmt(amount);
  el.bigWinSub.textContent = sub;
  el.bigWin.classList.add('show');
  setTimeout(() => el.bigWin.classList.remove('show'), 3200);
}

function showJackpotOverlay(label, amount) {
  el.jpWinTag.textContent = `${label} JACKPOT!`;
  el.jpWinAmount.textContent = fmt(amount);
  el.jackpotWin.classList.add('show');
  setTimeout(() => el.jackpotWin.classList.remove('show'), 4000);
}

async function doSpin() {
  if (state.spinning) return;

  const bet = totalBet();
  const isFree = state.freeSpinsLeft > 0;

  if (!isFree && state.balance < bet) {
    el.status.textContent = 'Insufficient balance';
    state.autoSpin = false;
    updateHud();
    return;
  }

  await ensureAudio();
  if (state.freeSpinsLeft > 0) audio.startBgm(true);
  else audio.startBgm(false);

  clearWinDisplay();
  state.lastResult = null;

  state.spinning = true;
  el.status.textContent = 'Spinning...';
  el.lastWin.textContent = '0';
  audio.playClick();
  updateHud();

  let grid;
  let result;
  let totalWin = 0;
  let jp = null;

  try {
    const resp = await runSpin(state);

    applyServerState(resp);
    grid = resp.grid;
    result = resp.result;

    await animateReels(grid);

    state.lastResult = result;

    totalWin = resp.totalWin ?? 0;
    jp = resp.jackpot;

    if (jp) {
      audio.playBigWin();
      audio.playBonus();
      showJackpotOverlay(jp.label, jp.amount);
      renderJackpots();
    }

    if (totalWin > 0 || result.totalFreeSpins > 0) {
      el.lastWin.textContent = fmt(totalWin);

      if (jp) {
        /* sounds played */
      } else if (totalWin >= bet * GAME_DEFAULTS.bigWinMultiplier) {
        audio.playBigWin();
        showBigWin(
          'BIG WIN',
          totalWin,
          result.effectiveMult > 1 ? `×${result.effectiveMult} multiplier` : ''
        );
      } else {
        audio.playWin();
        setTimeout(() => audio.playCoins(), 200);
      }

      if (result.scatterWin || result.totalFreeSpins > 0) {
        audio.playBonus();
        if (result.scatterCount >= 3) {
          showBigWin(
            'FREE SPINS',
            result.totalFreeSpins,
            `Win multiplier ×${state.sessionWinMult}`
          );
        }
      }

      if (result.lineMultBoost > 1 && !result.scatterWin) {
        audio.playBonus();
      }

      const parts = [];
      if (result.lineWins.length) parts.push(`${result.lineWins.length} lines`);
      if (result.effectiveMult > 1) parts.push(`×${result.effectiveMult}`);
      if (result.scatterCount >= 3) parts.push(`${result.scatterCount} scatters`);
      if (result.totalFreeSpins) parts.push(`+${result.totalFreeSpins} FS`);
      el.status.textContent = `WIN! ${parts.join(' · ')}`;
    } else {
      el.status.textContent = 'No win — spin again!';
    }

    if (state.freeSpinsLeft === 0 && isFree) {
      audio.startBgm(false);
    }

    if (grid && result) {
      renderGrid(grid, winningCellKeys(result));
    }
    renderJackpots();
  } catch (err) {
    console.warn(err);
    el.status.textContent = err.message || 'Spin failed';
    state.autoSpin = false;
  } finally {
    state.spinning = false;
    updateHud();
    requestAnimationFrame(() => updateHud());
  }

  if (state.autoSpin && (state.autoRemaining > 0 || state.autoRemaining === -1)) {
    if (state.autoRemaining > 0) state.autoRemaining--;
    if (state.balance >= totalBet() || state.freeSpinsLeft > 0) {
      setTimeout(doSpin, 800);
    } else {
      state.autoSpin = false;
      el.status.textContent = 'Auto stopped — low balance';
      updateHud();
    }
  }
}

function paytableHtml() {
  return `
    <p><strong>4×5 · 40 paylines</strong> — Server decides wins (not visible in browser).</p>
    <h4>Features</h4>
    <ul>
      <li>Scatter &amp; Bonus multipliers</li>
      <li>Free spin sessions with rising multiplier</li>
      <li>Progressive Mini / Minor / Major / Mega jackpots</li>
    </ul>
    <h4>Sounds (kit WAV)</h4>
    <p>Background, spin, win, coins, big win, bonus, button, choose, buy, reel stop + Neon BG in free spins.</p>
  `;
}

function bindEvents() {
  el.spinBtn.onclick = () => {
    if (state.autoSpin) {
      state.autoSpin = false;
      state.spinning = false;
      updateHud();
      return;
    }
    if (state.spinning) {
      state.spinning = false;
      updateHud();
    }
    void doSpin();
  };

  el.betDown.onclick = async () => {
    await ensureAudio();
    audio.playChoose();
    state.lineBet = Math.max(1, state.lineBet - 1);
    savePrefs();
    updateHud();
  };
  el.betUp.onclick = async () => {
    await ensureAudio();
    audio.playChoose();
    state.lineBet = Math.min(GAME_DEFAULTS.maxLineBet, state.lineBet + 1);
    savePrefs();
    updateHud();
  };
  el.linesDown.onclick = async () => {
    await ensureAudio();
    audio.playChoose();
    state.activeLines = Math.max(1, state.activeLines - 1);
    savePrefs();
    updateHud();
  };
  el.linesUp.onclick = async () => {
    await ensureAudio();
    audio.playChoose();
    state.activeLines = Math.min(MAX_PAYLINES, state.activeLines + 1);
    savePrefs();
    updateHud();
  };

  el.maxBetBtn.onclick = async () => {
    await ensureAudio();
    audio.playBuy();
    state.lineBet = GAME_DEFAULTS.maxLineBet;
    state.activeLines = MAX_PAYLINES;
    state.betMult = BET_MULTIPLIERS[BET_MULTIPLIERS.length - 1];
    savePrefs();
    updateHud();
  };

  el.autoBtn.onclick = () => {
    if (state.autoSpin) {
      state.autoSpin = false;
      updateHud();
      return;
    }
    const n = prompt('Auto spins (10, 25, 50, 0=unlimited):', '25');
    if (n === null) return;
    const v = parseInt(n, 10);
    state.autoRemaining = v === 0 ? -1 : Math.max(1, v || 25);
    state.autoSpin = true;
    updateHud();
    doSpin();
  };

  el.paytableBtn.onclick = () => {
    el.overlayTitle.textContent = 'Paytable & Features';
    el.overlayBody.innerHTML = paytableHtml();
    el.overlay.classList.add('open');
  };

  el.overlayClose.onclick = () => el.overlay.classList.remove('open');
  el.overlay.onclick = (e) => {
    if (e.target === el.overlay) el.overlay.classList.remove('open');
  };

  el.soundToggle.onchange = async () => {
    state.sound = el.soundToggle.checked;
    audio.setEnabled(state.sound);
    if (state.sound) await audio.unlock();
    savePrefs();
  };

  window.addEventListener('resize', () => {
    if (state.grid) drawWinLines();
  });
}

async function initGame() {
  audio.setEnabled(state.sound);
  buildBetMultButtons();
  buildReels();
  preloadSymbolImages();
  state.jackpots = mergeJackpots(state.jackpots);
  renderJackpots();
  renderGrid(demoGrid());
  bindEvents();
  el.soundToggle.checked = state.sound;
  document.body.addEventListener('click', () => audio.unlock(), { once: true });

  const preview = previewGrid();
  renderGrid(preview.grid);
  renderJackpots();
  el.status.textContent = 'Spin to win!';

  updateHud();
}

async function boot() {
  const session = await requireSession();
  if (!session) {
    window.location.replace('index.html');
    return;
  }

  playerStore.setUserId(session.user.id);
  const label = document.getElementById('userLabel');
  const logoutBtn = document.getElementById('logoutBtn');
  if (label) {
    label.textContent = session.user.email ?? 'Player';
    label.title = session.user.email ?? '';
  }
  logoutBtn?.addEventListener('click', async () => {
    await playerStore.flushSaveNow(state);
    await signOut();
    window.location.replace('index.html');
  });

  document.querySelector('a[href="dashboard.html"]')?.addEventListener('click', () => {
    playerStore.flushSaveNow(state);
  });

  loadPrefs();
  try {
    await playerStore.loadProfile(state);
  } catch (err) {
    console.warn('Cloud profile load failed.', err);
  }

  await initGame();

  window.addEventListener('beforeunload', () => {
    playerStore.flushSaveNow(state);
  });
}

boot();
