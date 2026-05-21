import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import {
  defaultJackpots,
  evaluate,
  GAME_DEFAULTS,
  spinGrid,
  contributeJackpots,
  tryJackpotWin,
} from '../_shared/slot-logic.ts';

const BET_MULTS = [1, 2, 3, 5, 10];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Not signed in' }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser();
    if (userErr || !user) return json({ error: 'Invalid session' }, 401);

    const body = req.method === 'POST' ? await req.json() : {};
    const preview = !!body.preview;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profErr || !profile) return json({ error: 'Profile not found' }, 404);

    let lineBet = preview ? profile.line_bet : Number(body.lineBet ?? profile.line_bet);
    let activeLines = preview
      ? profile.active_lines
      : Number(body.activeLines ?? profile.active_lines);
    let betMult = preview ? profile.bet_mult : Number(body.betMult ?? profile.bet_mult);

    lineBet = Math.max(1, Math.min(GAME_DEFAULTS.maxLineBet, Math.floor(lineBet)));
    activeLines = Math.max(
      1,
      Math.min(GAME_DEFAULTS.maxActiveLines, Math.floor(activeLines))
    );
    if (!BET_MULTS.includes(betMult)) betMult = profile.bet_mult;

    let balance = Number(profile.balance);
    let freeSpinsLeft = Number(profile.free_spins_left ?? 0);
    let sessionWinMult = Number(profile.session_win_mult ?? 1);
    const jackpots =
      profile.jackpots && Object.keys(profile.jackpots).length
        ? { ...defaultJackpots(), ...profile.jackpots }
        : defaultJackpots();

    if (preview) {
      const grid = spinGrid();
      return json({
        grid,
        balance,
        freeSpinsLeft,
        sessionWinMult,
        jackpots,
        lineBet,
        activeLines,
        betMult,
      });
    }

    const bet = lineBet * activeLines * betMult;
    const isFree = freeSpinsLeft > 0;

    if (!isFree && balance < bet) {
      return json({ error: 'Insufficient balance' }, 400);
    }

    if (!isFree) {
      balance -= bet;
      contributeJackpots(jackpots, bet);
    } else {
      freeSpinsLeft--;
    }

    const grid = spinGrid();
    const sessionMult = isFree ? sessionWinMult : 1;
    const result = evaluate(grid, activeLines, lineBet, betMult, sessionMult);

    let totalWin = result.totalPay;
    const jackpot = tryJackpotWin(jackpots, result.wildCount);
    if (jackpot) totalWin += jackpot.amount;

    if (totalWin > 0 || result.totalFreeSpins > 0) {
      balance += totalWin;
      if (result.scatterWin || result.totalFreeSpins > 0) {
        const sm = (result.scatterWin as { mult?: number })?.mult || 1;
        sessionWinMult = Math.max(
          sessionWinMult,
          sm,
          GAME_DEFAULTS.freeSpinStartMult
        );
        freeSpinsLeft += result.totalFreeSpins;
      }
      if (isFree && totalWin > 0) {
        sessionWinMult = Math.min(
          GAME_DEFAULTS.freeSpinMultCap,
          sessionWinMult + 1
        );
      }
    } else if (!isFree) {
      sessionWinMult = GAME_DEFAULTS.freeSpinStartMult;
    }

    if (freeSpinsLeft === 0 && isFree) {
      sessionWinMult = 1;
    }

    const { error: updErr } = await supabaseAdmin
      .from('profiles')
      .update({
        balance,
        line_bet: lineBet,
        active_lines: activeLines,
        bet_mult: betMult,
        jackpots,
        free_spins_left: freeSpinsLeft,
        session_win_mult: sessionWinMult,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updErr) return json({ error: updErr.message }, 500);

    return json({
      grid,
      result,
      jackpot,
      balance,
      freeSpinsLeft,
      sessionWinMult,
      jackpots,
      lineBet,
      activeLines,
      betMult,
      bet,
      totalWin,
    });
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
