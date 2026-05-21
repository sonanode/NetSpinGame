import { getSupabase } from './supabase-client.js';

export async function fetchPreviewGrid() {
  const sb = getSupabase();
  if (!sb) throw new Error('Not connected');
  const { data, error } = await sb.functions.invoke('spin', {
    body: { preview: true },
  });
  if (error) throw new Error(error.message || 'Preview failed');
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function requestSpin({ lineBet, activeLines, betMult }) {
  const sb = getSupabase();
  if (!sb) throw new Error('Not connected');
  const { data, error } = await sb.functions.invoke('spin', {
    body: { lineBet, activeLines, betMult },
  });
  if (error) throw new Error(error.message || 'Spin failed');
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function saveSettings({ lineBet, activeLines, betMult, sound }) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.functions.invoke('update-settings', {
    body: { lineBet, activeLines, betMult, sound },
  });
}
