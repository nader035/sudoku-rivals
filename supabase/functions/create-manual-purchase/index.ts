import { handleRpcRequest } from '../_shared/rpc.ts';
import { serve } from '../_shared/runtime.ts';

serve(async (request) => {
  const body = await request.json();
  const method = body.paymentMethod ?? body.method ?? null;
  return handleRpcRequest(request, 'create_manual_purchase', {
    p_package_id: body.packageId,
    p_payment_method: method,
    p_idempotency_key: body.idempotencyKey ?? null,
  });
});
