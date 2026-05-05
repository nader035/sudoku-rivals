import { handleRpcRequest } from '../_shared/rpc.ts';
import { serve } from '../_shared/runtime.ts';

serve(async (request) => {
  const body = await request.json();
  return handleRpcRequest(request, 'admin_approve_purchase', {
    p_purchase_id: body.purchaseId,
    p_reason: body.reason ?? null,
  });
});
