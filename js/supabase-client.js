import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const STORAGE_KEY = 'mk_supabase_anon_key';

let client = null;
let configError = null;

function isPlaceholderKey (key) {
  if (!key?.trim()) return true;
  const k = key.trim();
  return (
    k.includes('PASTE') ||
    k.includes('YOUR_ANON') ||
    k === 'YOUR_ANON_PUBLIC_KEY'
  );
}

function resolveAnonKey () {
  if (!isPlaceholderKey(SUPABASE_ANON_KEY)) return SUPABASE_ANON_KEY.trim();
  return localStorage.getItem(STORAGE_KEY)?.trim() || '';
}

function buildClient () {
  const key = resolveAnonKey();
  if (!SUPABASE_URL?.trim() || SUPABASE_URL.includes('YOUR_PROJECT')) {
    client = null;
    configError = 'Invalid SUPABASE_URL in js/supabase-config.js';
    return false;
  }
  if (!key) {
    client = null;
    configError =
      'Connect Supabase: paste your anon / publishable key below (from Supabase → Settings → API Keys).';
    return false;
  }
  client = createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  configError = null;
  return true;
}

/** Save key from setup form (browser only) and connect */
export function saveAnonKeyAndConnect (key) {
  const trimmed = key?.trim();
  if (!trimmed || trimmed.length < 20) {
    return { ok: false, message: 'Key looks too short. Copy the full anon or publishable key.' };
  }
  localStorage.setItem(STORAGE_KEY, trimmed);
  if (!buildClient()) {
    return { ok: false, message: configError || 'Could not connect.' };
  }
  return { ok: true };
}

buildClient();

export function getSupabase () {
  return client;
}

export function getConfigError () {
  return configError;
}

export function isConfigured () {
  return !!client;
}
