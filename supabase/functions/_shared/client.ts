import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { readEnv } from './runtime.ts';

export function createServiceClient() {
  const url = readEnv('SUPABASE_URL');
  const serviceRole = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) throw new Error('Missing Supabase env vars');
  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function parseBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header) return null;
  const [type, value] = header.split(' ');
  if (type !== 'Bearer' || !value) return null;
  return value;
}

export async function getUserIdFromRequest(request: Request): Promise<string> {
  const token = parseBearerToken(request);
  if (!token) throw new Error('Missing Authorization Bearer token');
  const client = createServiceClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid user token');
  return data.user.id;
}
