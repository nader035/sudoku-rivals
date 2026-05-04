import { handleRpcRequest } from '../_shared/rpc.ts';

Deno.serve(async (request) => {
  const body = await request.json();
  return handleRpcRequest(request, 'admin_refund_match', {
    p_match_id: body.matchId,
    p_reason: body.reason,
  });
});

