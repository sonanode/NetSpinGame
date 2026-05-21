/**
 * Kit WAV audio — user-selected files from 0_Common + Neon background
 */
const PATHS = {
  bgm: 'sounds/common/Background.wav',
  bgmFree: 'sounds/neon/background.wav',
  spin: 'sounds/common/spin_sound.wav',
  win: 'sounds/common/win_sound.wav',
  coins: 'sounds/common/win_coins.wav',
  bigWin: 'sounds/common/big_win.wav',
  bonus: 'sounds/common/Bonus.wav',
  button: 'sounds/common/button.wav',
  choose: 'sounds/common/choose.wav',
  buy: 'sounds/common/Buy.wav',
  reelStop: 'sounds/common/pointer_hit.wav',
};

export class AudioManager {
  constructor() {
    this.enabled = true;
    this.cache = new Map();
    this.bgm = null;
    this.bgmFree = null;
    this.spin = null;
    this._unlocked = false;
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.stopAll();
    else if (this._unlocked) this.startBgm(false);
  }

  _el(key, loop = false, vol = 1) {
    if (!this.cache.has(key)) {
      const a = new Audio(PATHS[key]);
      a.preload = 'auto';
      this.cache.set(key, a);
    }
    const a = this.cache.get(key);
    a.loop = loop;
    a.volume = vol;
    return a;
  }

  async unlock() {
    if (this._unlocked) return;
    Object.keys(PATHS).forEach((k) => this._el(k));
    this._unlocked = true;
    if (this.enabled) this.startBgm(false);
  }

  stopAll() {
    this.stopSpinLoop();
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
    }
    if (this.bgmFree) {
      this.bgmFree.pause();
      this.bgmFree.currentTime = 0;
    }
    this.cache.forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });
  }

  startBgm(freeSpinMode) {
    if (!this.enabled || !this._unlocked) return;
    const main = this._el('bgm', true, 0.35);
    const neon = this._el('bgmFree', true, 0);
    this.bgm = main;
    this.bgmFree = neon;
    main.play().catch(() => {});
    if (freeSpinMode) {
      main.volume = 0.12;
      neon.volume = 0.4;
      neon.play().catch(() => {});
    } else {
      main.volume = 0.35;
      neon.pause();
      neon.currentTime = 0;
    }
  }

  startSpinLoop() {
    if (!this.enabled) return;
    this.stopSpinLoop();
    this.spin = this._el('spin', true, 0.55);
    this.spin.currentTime = 0;
    this.spin.play().catch(() => {});
  }

  stopSpinLoop() {
    if (this.spin) {
      this.spin.pause();
      this.spin.currentTime = 0;
      this.spin = null;
    }
  }

  play(key, vol = 0.7) {
    if (!this.enabled || !this._unlocked) return;
    const src = this._el(key, false, vol);
    const clone = src.cloneNode();
    clone.volume = vol;
    clone.play().catch(() => {});
  }

  playReelStop(col) {
    this.play('reelStop', 0.45 + col * 0.04);
  }

  playClick() {
    this.play('button', 0.65);
  }
  playChoose() {
    this.play('choose', 0.6);
  }
  playBuy() {
    this.play('buy', 0.7);
  }
  playWin() {
    this.play('win', 0.75);
  }
  playCoins() {
    this.play('coins', 0.8);
  }
  playBigWin() {
    this.play('bigWin', 0.9);
  }
  playBonus() {
    this.play('bonus', 0.85);
  }
}

export const audio = new AudioManager();
