import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient, getUserIdFromRequest } from '../_shared/client.ts';
import { serve } from '../_shared/runtime.ts';

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const userId = await getUserIdFromRequest(request);
    const body = await request.json();
    const client = createServiceClient();

    const { data: roleData, error: roleError } = await client.rpc('has_admin_permission', {
      p_user_id: userId,
      p_permission: 'manage_shop',
    });
    if (roleError) throw roleError;
    if (!roleData) throw new Error('Admin permission required');

    const { data, error } = await client
      .from('shop_packages')
      .update({
        name: body.name,
        coins_amount: body.coinsAmount,
        bonus_coins: body.bonusCoins ?? 0,
        price: body.price,
        currency: body.currency ?? 'EGP',
        badge: body.badge ?? null,
        sort_order: body.sortOrder ?? 0,
        is_active: body.isActive ?? true,
      })
      .eq('id', body.id)
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
