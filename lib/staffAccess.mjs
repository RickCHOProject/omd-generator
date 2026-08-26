export const OMD_ROLES = {
  OWNER: 'owner',
  STAFF: 'staff'
};

export const DEFAULT_OWNER_EMAIL = 'rick@cactushomeoffer.com';

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export const getOMDAccess = (user, ownerEmail = DEFAULT_OWNER_EMAIL) => {
  if (!user?.id || !user?.email) return null;

  const email = normalizeEmail(user.email);
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const displayName = String(
    user.user_metadata?.display_name
      || user.user_metadata?.full_name
      || user.user_metadata?.name
      || email.split('@')[0]
  ).trim().slice(0, 80);

  if (email === normalizedOwnerEmail) {
    return {
      sub: user.id,
      email,
      name: displayName || email,
      role: OMD_ROLES.OWNER,
      active: true
    };
  }

  if (user.app_metadata?.omd_role !== OMD_ROLES.STAFF || user.app_metadata?.omd_active === false) {
    return null;
  }

  return {
    sub: user.id,
    email,
    name: displayName || email,
    role: OMD_ROLES.STAFF,
    active: true
  };
};

export const isOwner = (session) => session?.role === OMD_ROLES.OWNER;

