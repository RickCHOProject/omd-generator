import { createSupabaseAuthClient } from './supabaseAuthServer';
import { DEFAULT_OWNER_EMAIL, getOMDAccess, isOwner } from './staffAccess.mjs';

export const getStaffSession = async () => {
  const supabase = await createSupabaseAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return getOMDAccess(user, process.env.OMD_OWNER_EMAIL || DEFAULT_OWNER_EMAIL);
};

export const getOwnerSession = async () => {
  const session = await getStaffSession();
  return isOwner(session) ? session : null;
};
