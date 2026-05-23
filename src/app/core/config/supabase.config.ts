import { environment } from '../../../environments/environment';

export const SUPABASE_URL = environment.supabaseUrl;
export const SUPABASE_ANON_KEY = environment.supabaseKey;
export const APP_URL = (environment as { appUrl?: string }).appUrl ?? '';
