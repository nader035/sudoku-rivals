import { handleRpcRequest } from '../_shared/rpc.ts';

Deno.serve(async (request) => {
  const body = await request.json();
  return handleRpcRequest(request, 'create_manual_purchase', {
    p_package_id: body.packageId,
    p_payment_method: body.paymentMethod,
    p_idempotency_key: body.idempotencyKey ?? null,
  });
});

