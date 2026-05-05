import { handleRpcRequest } from '../_shared/rpc.ts';
import { serve } from '../_shared/runtime.ts';

serve(async (request) => {
  const body = await request.json();
  const senderField = body.senderPhone ?? body.senderIdentifier ?? body.sender ?? null;
  return handleRpcRequest(request, 'confirm_manual_purchase_transfer', {
    p_purchase_id: body.purchaseId,
    p_sender_phone: senderField,
    p_sender_name: body.senderName ?? null,
    p_payment_reference: body.paymentReference ?? null,
    p_transfer_screenshot_url: body.transferScreenshotUrl ?? null,
    p_user_note: body.userNote ?? null,
  });
});
