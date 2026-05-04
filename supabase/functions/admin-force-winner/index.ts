import { handleRpcRequest } from '../_shared/rpc.ts';

Deno.serve(async (request) => {
  const body = await request.json();
  return handleRpcRequest(request, 'admin_force_winner', {
    p_match_id: body.matchId,
    p_winner_player_id: body.winnerPlayerId,
    p_reason: body.reason,
  });
});

