import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient, getUserIdFromRequest } from '../_shared/client.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const userId = await getUserIdFromRequest(request);
    const body = await request.json();
    const client = createServiceClient();

    const { data: player, error: playerError } = await client
      .from('players')
      .select('id')
      .eq('auth_id', userId)
      .maybeSingle();
    if (playerError) throw playerError;
    if (!player) throw new Error('Player profile not found');

    const { data, error } = await client.rpc('join_room', {
      p_room_id: body.matchId,
      p_player_id: player.id,
      p_password: body.password ?? null,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

