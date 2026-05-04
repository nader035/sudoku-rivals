import { corsHeaders } from './cors.ts';
import { createServiceClient, getUserIdFromRequest } from './client.ts';

export async function handleRpcRequest(
  request: Request,
  rpcName: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const userId = await getUserIdFromRequest(request);
    const client = createServiceClient();

    const { data, error } = await client.rpc(rpcName, payload);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, actor: userId, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
}
