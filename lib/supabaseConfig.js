export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  || process.env.SUPABASE_URL
  || 'https://wqvfsynpxfwacesvjlmd.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || 'sb_publishable_L0SuigrNUZpsWC66KSVCOA_EuypYe5i';

export const getSupabaseAdminKey = () => process.env.SUPABASE_SECRET_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || '';
