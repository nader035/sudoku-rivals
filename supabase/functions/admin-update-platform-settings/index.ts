import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient, getUserIdFromRequest } from '../_shared/client.ts';
import { serve } from '../_shared/runtime.ts';

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const userId = await getUserIdFromRequest(request);
    const body = await request.json();
    const client = createServiceClient();

    const { data: canManage, error: roleError } = await client.rpc('has_admin_permission', {
      p_user_id: userId,
      p_permission: 'manage_settings',
    });
    if (roleError) throw roleError;
    if (!canManage) throw new Error('Admin permission required');

    const { data, error } = await client
      .from('platform_settings')
      .upsert({
        key: body.key,
        value: body.value,
        value_type: body.valueType ?? 'json',
        description: body.description ?? null,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })
      .select('*')
      .maybeSingle();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
