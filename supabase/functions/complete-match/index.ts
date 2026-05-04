import { handleRpcRequest } from '../_shared/rpc.ts';

Deno.serve(async (request) => {
  const body = await request.json();
  return handleRpcRequest(request, 'finalize_room_with_winner', {
    p_room_id: body.matchId,
    p_winner_id: body.winnerPlayerId,
    p_winning_time: body.winningTime ?? null,
  });
});
