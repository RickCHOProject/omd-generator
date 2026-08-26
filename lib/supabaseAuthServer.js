import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseAdminKey, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './supabaseConfig';

export const createSupabaseAuthClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Read-only Server Components cannot write refreshed cookies.
        }
      }
    }
  });
};

export const createSupabaseAdminClient = () => {
  const key = getSupabaseAdminKey();
  if (!key) return null;

  return createClient(SUPABASE_URL, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

