import { getSupabase } from './supabase-client.js';

function spinDeployError(err) {
  const msg = err?.message || String(err);
  if (
    /edge function/i.test(msg) ||
    /failed to send/i.test(msg) ||
    /function not found/i.test(msg)
  ) {
    return new Error(
      'เซิร์ฟเวอร์เกมยังไม่พร้อม — ต้อง deploy ฟังก์ชัน spin บน Supabase (ดู SETUP-DEPLOY-SPIN-TH.md)'
    );
  }
  return new Error(msg || 'Spin failed');
}

export async function fetchPreviewGrid() {
  const sb = getSupabase();
  if (!sb) throw new Error('Not connected');
  const { data, error } = await sb.functions.invoke('spin', {
    body: { preview: true },
  });
  if (error) throw spinDeployError(error);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function requestSpin({ lineBet, activeLines, betMult }) {
  const sb = getSupabase();
  if (!sb) throw new Error('Not connected');
  const { data, error } = await sb.functions.invoke('spin', {
    body: { lineBet, activeLines, betMult },
  });
  if (error) throw spinDeployError(error);
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
