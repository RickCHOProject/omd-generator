import { getSupabaseAdminKey, SUPABASE_URL } from './supabaseConfig';

const unavailableResponse = () => new Response(JSON.stringify({ error: 'Secure database access is not configured.' }), {
  status: 503,
  headers: { 'Content-Type': 'application/json' }
});

export const supabaseServerFetch = (path, options = {}) => {
  const key = getSupabaseAdminKey();
  if (!key) return Promise.resolve(unavailableResponse());

  const authorization = key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` };
  return fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      apikey: key,
      ...authorization,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {})
    }
  });
};
