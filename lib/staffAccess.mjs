export const OMD_ROLES = {
  OWNER: 'owner',
  STAFF: 'staff'
};

export const DEFAULT_OWNER_EMAIL = 'rick@cactushomeoffer.com';

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const NAME_SUFFIXES = new Map([
  ['jr', 'Jr.'],
  ['sr', 'Sr.'],
  ['ii', 'II'],
  ['iii', 'III'],
  ['iv', 'IV']
]);

const formatNameWord = (word) => {
  const suffix = NAME_SUFFIXES.get(word.toLowerCase().replaceAll('.', ''));
  if (suffix) return suffix;

  const titled = word
    .toLowerCase()
    .replace(/(^|[-'’])([a-z])/g, (_, boundary, letter) => `${boundary}${letter.toUpperCase()}`);

  return titled.replace(/^Mc([a-z])/, (_, letter) => `Mc${letter.toUpperCase()}`);
};

export const formatDisplayName = (value) => String(value || '')
  .trim()
  .replace(/\s+/g, ' ')
  .split(' ')
  .filter(Boolean)
  .map(formatNameWord)
  .join(' ')
  .slice(0, 80);

export const isFullDisplayName = (value) => formatDisplayName(value).split(' ').filter(Boolean).length >= 2;

export const getOMDAccess = (user, ownerEmail = DEFAULT_OWNER_EMAIL) => {
  if (!user?.id || !user?.email) return null;

  const email = normalizeEmail(user.email);
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const displayName = formatDisplayName(
    user.user_metadata?.display_name
      || user.user_metadata?.full_name
      || user.user_metadata?.name
      || email.split('@')[0]
  );

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
