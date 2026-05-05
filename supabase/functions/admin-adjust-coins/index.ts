import { handleRpcRequest } from '../_shared/rpc.ts';
import { serve } from '../_shared/runtime.ts';

serve(async (request) => {
  const body = await request.json();
  return handleRpcRequest(request, 'admin_adjust_wallet', {
    p_target_user_id: body.targetUserId,
    p_amount: body.amount,
    p_reason: body.reason,
  });
});
