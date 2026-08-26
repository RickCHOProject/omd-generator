const PASSWORD_SETUP_TYPES = new Set(['invite', 'recovery', 'signup']);

export const getEmailOtpType = (value) => {
  const type = String(value || '').trim().toLowerCase();
  return PASSWORD_SETUP_TYPES.has(type) ? type : null;
};

export const safeNextPath = (value, fallback = '/admin') => {
  const path = typeof value === 'string' ? value.trim() : '';
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || /[\u0000-\u001f\u007f]/.test(path)) {
    return fallback;
  }

  try {
    const decodedPath = decodeURIComponent(path);
    if (decodedPath.startsWith('//') || decodedPath.includes('\\') || /[\u0000-\u001f\u007f]/.test(decodedPath)) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  return path;
};

export const getEmailFlowNext = (type, requestedNext) => safeNextPath(
  requestedNext,
  PASSWORD_SETUP_TYPES.has(type) ? '/reset-password' : '/admin'
);
