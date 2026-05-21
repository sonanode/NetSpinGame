import {
  getConfigError,
  getSession,
  isConfigured,
  signIn,
  signInWithProvider,
  signUp,
} from './auth.js';
import { saveAnonKeyAndConnect } from './supabase-client.js';

const el = {
  tabs: document.querySelectorAll('.auth-tab'),
  panelSignIn: document.getElementById('panelSignIn'),
  panelSignUp: document.getElementById('panelSignUp'),
  formSignIn: document.getElementById('formSignIn'),
  formSignUp: document.getElementById('formSignUp'),
  msg: document.getElementById('authMsg'),
  configWarn: document.getElementById('configWarn'),
  keySetup: document.getElementById('keySetup'),
  authMain: document.getElementById('authMain'),
  anonKeyInput: document.getElementById('anonKeyInput'),
  saveKeyBtn: document.getElementById('saveKeyBtn'),
};

function showMsg (text, type = 'info') {
  el.msg.textContent = text;
  el.msg.className = `auth-msg ${type}`;
  el.msg.hidden = !text;
}

function setTab (mode) {
  const signIn = mode === 'signin';
  el.tabs.forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === mode);
  });
  el.panelSignIn.hidden = !signIn;
  el.panelSignUp.hidden = signIn;
  showMsg('');
}

function showKeySetup (show) {
  if (el.keySetup) el.keySetup.hidden = !show;
  if (el.authMain) el.authMain.hidden = show;
}

async function boot () {
  let cfgErr = getConfigError();
  if (cfgErr) {
    showKeySetup(true);
    el.configWarn.hidden = true;
    el.saveKeyBtn?.addEventListener('click', () => {
      const result = saveAnonKeyAndConnect(el.anonKeyInput?.value);
      if (!result.ok) {
        showMsg(result.message, 'error');
        return;
      }
      showKeySetup(false);
      showMsg('Connected! You can sign in now.', 'success');
      bindAuthUi();
    });
    return;
  }

  showKeySetup(false);
  el.configWarn.hidden = true;
  await continueBoot();
}

async function continueBoot () {
  const session = await getSession();
  if (session && isConfigured()) {
    window.location.replace('game.html');
    return;
  }

  bindAuthUi();
}

function bindAuthUi () {
  el.tabs.forEach((t) => {
    t.onclick = () => setTab(t.dataset.tab);
  });

  async function oauth (provider, label) {
    showMsg(`Redirecting to ${label}…`, 'info');
    const { error } = await signInWithProvider(provider);
    if (error) showMsg(error.message, 'error');
  }

  document.getElementById('btnGoogle')?.addEventListener('click', () => {
    oauth('google', 'Google');
  });
  document.getElementById('btnFacebook')?.addEventListener('click', () => {
    oauth('facebook', 'Facebook');
  });

  el.formSignIn.onsubmit = async (e) => {
    e.preventDefault();
    showMsg('Signing in…', 'info');
    const fd = new FormData(el.formSignIn);
    const { error } = await signIn(fd.get('email'), fd.get('password'));
    if (error) {
      showMsg(error.message, 'error');
      return;
    }
    window.location.replace('game.html');
  };

  el.formSignUp.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(el.formSignUp);
    const pass = fd.get('password');
    const pass2 = fd.get('password2');
    if (pass !== pass2) {
      showMsg('Passwords do not match.', 'error');
      return;
    }
    if (String(pass).length < 6) {
      showMsg('Password must be at least 6 characters.', 'error');
      return;
    }
    showMsg('Creating account…', 'info');
    const { data, error } = await signUp(
      fd.get('email'),
      pass,
      fd.get('displayName')
    );
    if (error) {
      showMsg(error.message, 'error');
      return;
    }
    if (data.session) {
      window.location.replace('game.html');
      return;
    }
    showMsg(
      'Account created. If email confirmation is enabled, check your inbox then sign in.',
      'success'
    );
    setTab('signin');
  };
}

boot();
