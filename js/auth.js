import { getConfigError, getSupabase, isConfigured } from './supabase-client.js';

export async function getSession () {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session ?? null;
}

export async function requireSession () {
  const session = await getSession();
  return session;
}

export async function signUp (email, password, displayName) {
  const err = getConfigError();
  if (err) return { error: { message: err } };
  const sb = getSupabase();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || email.split('@')[0] },
      emailRedirectTo: `${window.location.origin}${window.location.pathname.replace(/index\.html$/, '')}game.html`,
    },
  });
  return { data, error };
}

export async function signIn (email, password) {
  const err = getConfigError();
  if (err) return { error: { message: err } };
  const sb = getSupabase();
  return sb.auth.signInWithPassword({ email, password });
}

export async function signInWithProvider (provider) {
  const err = getConfigError();
  if (err) return { error: { message: err } };
  const sb = getSupabase();
  const base = window.location.pathname.replace(/\/[^/]*$/, '/');
  const redirectTo = `${window.location.origin}${base}game.html`;
  return sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
}

export async function signOut () {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

export function onAuthStateChange (callback) {
  const sb = getSupabase();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}

export { getConfigError, isConfigured };
