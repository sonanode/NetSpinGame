import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import { GAME_DEFAULTS } from '../_shared/slot-logic.ts';

const BET_MULTS = [1, 2, 3, 5, 10];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Not signed in' }, 401);

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) return json({ error: 'Invalid session' }, 401);

    const body = await req.json();
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.lineBet != null) {
      patch.line_bet = Math.max(
        1,
        Math.min(GAME_DEFAULTS.maxLineBet, Math.floor(Number(body.lineBet)))
      );
    }
    if (body.activeLines != null) {
      patch.active_lines = Math.max(
        1,
        Math.min(GAME_DEFAULTS.maxActiveLines, Math.floor(Number(body.activeLines)))
      );
    }
    if (body.betMult != null && BET_MULTS.includes(Number(body.betMult))) {
      patch.bet_mult = Number(body.betMult);
    }
    if (typeof body.sound === 'boolean') patch.sound = body.sound;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(patch)
      .eq('id', user.id);

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, ...patch });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
