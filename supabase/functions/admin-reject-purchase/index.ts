import { handleRpcRequest } from '../_shared/rpc.ts';

Deno.serve(async (request) => {
  const body = await request.json();
  return handleRpcRequest(request, 'admin_reject_purchase', {
    p_purchase_id: body.purchaseId,
    p_rejection_reason: body.rejectionReason,
  });
});

