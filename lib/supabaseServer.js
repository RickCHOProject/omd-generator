import { getSupabaseAdminKey, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './supabaseConfig';

export const supabaseServerFetch = (path, options = {}) => {
  const key = getSupabaseAdminKey() || SUPABASE_PUBLISHABLE_KEY;
  return fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {})
    }
  });
};
