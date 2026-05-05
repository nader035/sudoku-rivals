import { handleRpcRequest } from '../_shared/rpc.ts';
import { serve } from '../_shared/runtime.ts';

serve(async (request) => {
  const body = await request.json();
  return handleRpcRequest(request, 'admin_broadcast_notification', {
    p_title: body.title,
    p_message: body.message,
    p_reason: body.reason ?? null,
  });
});

