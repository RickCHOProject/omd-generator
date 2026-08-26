export const SESSION_COOKIE = 'omd_session';
export const SESSION_DURATION_SECONDS = 60 * 60 * 12;

const encoder = new TextEncoder();

const bytesToBase64Url = (bytes) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const base64UrlToBytes = (value) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const importSigningKey = (secret) => crypto.subtle.importKey(
  'raw',
  encoder.encode(secret),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign', 'verify']
);

export const hashPassword = async (password) => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const parseStaffUsers = (rawValue) => {
  try {
    const parsed = JSON.parse(rawValue || '{}');
    return Object.entries(parsed).reduce((users, [username, account]) => {
      const normalizedUsername = String(username || '').trim().toLowerCase();
      const passwordHash = String(account?.passwordHash || '').trim().toLowerCase();
      if (!normalizedUsername || !/^[a-f0-9]{64}$/.test(passwordHash)) return users;
      users[normalizedUsername] = {
        username: normalizedUsername,
        displayName: String(account?.displayName || normalizedUsername).trim().slice(0, 80),
        passwordHash
      };
      return users;
    }, {});
  } catch {
    return {};
  }
};

export const createSessionToken = async (identifier, secret, claims = {}) => {
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({
    sub: identifier,
    name: String(claims.name || identifier).slice(0, 80),
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS
  })));
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
};

export const verifySessionToken = async (token, secret) => {
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature || !secret) return null;

    const key = await importSigningKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(signature),
      encoder.encode(payload)
    );
    if (!valid) return null;

    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    if (!session.sub || !session.exp || session.exp <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
};
