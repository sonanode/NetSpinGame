import {
  getConfigError,
  getSession,
  isConfigured,
  onAuthStateChange,
  signIn,
  signInWithProvider,
  signOut,
  signOutAndClear,
} from './auth.js';
import { checkIsAdmin } from './admin-api.js';
import { saveAnonKeyAndConnect } from './supabase-client.js';

const CONSOLE_URL = 'admin.html';
const STAFF_EMAIL_HINT = 'team.sonanode@gmail.com';

function wantsLogout() {
  return new URLSearchParams(window.location.search).has('signed_out');
}

function clearLogoutQuery() {
  if (!wantsLogout()) return;
  history.replaceState(null, '', 'admin-login.html');
}

function hasAuthTokensInUrl() {
  const h = window.location.hash || '';
  const s = window.location.search || '';
  return (
    h.includes('access_token') ||
    h.includes('code=') ||
    s.includes('code=')
  );
}

async function waitForSession(maxMs = 5000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const s = await getSession();
    if (s) return s;
    await new Promise((r) => setTimeout(r, 80));
  }
  return null;
}

const el = {
  formSignIn: document.getElementById('formSignIn'),
  msg: document.getElementById('authMsg'),
  keySetup: document.getElementById('keySetup'),
  authMain: document.getElementById('authMain'),
  anonKeyInput: document.getElementById('anonKeyInput'),
  saveKeyBtn: document.getElementById('saveKeyBtn'),
  btnSignOutOther: document.getElementById('btnSignOutOther'),
};

function showMsg(text, type = 'info') {
  el.msg.textContent = text;
  el.msg.className = `auth-msg ${type}`;
  el.msg.hidden = !text;
}

function goConsole() {
  const dest = new URL(CONSOLE_URL, window.location.href);
  dest.hash = window.location.hash.replace(/^#/, '') ? window.location.hash : '#overview';
  window.location.replace(dest.href);
}

async function verifyAdminOrFail(session) {
  if (!session) return false;
  try {
    const ok = await checkIsAdmin();
    if (ok) return true;
    const email = session?.user?.email || '';
    showMsg(
      `Account ${email || '(unknown)'} is not an administrator. In Supabase run seed-admin-team-sonanode.sql for staff Google ${STAFF_EMAIL_HINT}.`,
      'error'
    );
    el.btnSignOutOther.hidden = false;
    return false;
  } catch (err) {
    showMsg(err.message || 'Run schema-admin.sql in Supabase first.', 'error');
    el.btnSignOutOther.hidden = false;
    return false;
  }
}

async function afterAuth(session) {
  if (await verifyAdminOrFail(session)) goConsole();
}

function bindAuthUi() {
  document.getElementById('btnGoogle')?.addEventListener('click', async () => {
    showMsg(`Use Google account ${STAFF_EMAIL_HINT}`, 'info');
    const { error } = await signInWithProvider('google', 'admin-login.html');
    if (error) showMsg(error.message, 'error');
  });

  el.formSignIn?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showMsg('Verifying staff access…', 'info');
    const fd = new FormData(el.formSignIn);
    const { error } = await signIn(fd.get('email'), fd.get('password'));
    if (error) {
      showMsg(error.message, 'error');
      return;
    }
    const session = await getSession();
    await afterAuth(session);
  });

  el.btnSignOutOther?.addEventListener('click', async () => {
    await signOutAndClear();
    el.btnSignOutOther.hidden = true;
    showMsg('Signed out. Sign in with a staff account.', 'info');
  });
}

function showKeySetup(show) {
  if (el.keySetup) el.keySetup.hidden = !show;
  if (el.authMain) el.authMain.hidden = show;
}

async function continueBoot() {
  if (wantsLogout()) {
    await signOutAndClear();
    clearLogoutQuery();
    showMsg('Signed out successfully.', 'success');
    bindAuthUi();
    return;
  }

  if (hasAuthTokensInUrl()) {
    showMsg('Completing Google sign-in…', 'info');
    const session = await waitForSession();
    if (session) {
      await afterAuth(session);
      return;
    }
  }

  const session = await getSession();
  if (session && isConfigured()) {
    await afterAuth(session);
    return;
  }

  let authHooked = false;
  onAuthStateChange((s) => {
    if (wantsLogout() || authHooked) return;
    if (s && isConfigured()) {
      authHooked = true;
      afterAuth(s);
    }
  });

  bindAuthUi();
}

async function boot() {
  const cfgErr = getConfigError();
  if (cfgErr) {
    showKeySetup(true);
    el.saveKeyBtn?.addEventListener('click', () => {
      const result = saveAnonKeyAndConnect(el.anonKeyInput?.value);
      if (!result.ok) {
        showMsg(result.message, 'error');
        return;
      }
      showKeySetup(false);
      showMsg('Connected. Staff sign in below.', 'success');
      bindAuthUi();
    });
    return;
  }

  showKeySetup(false);
  await continueBoot();
}

boot();
