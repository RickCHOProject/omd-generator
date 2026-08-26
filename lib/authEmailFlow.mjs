const PASSWORD_SETUP_TYPES = new Set(['invite', 'recovery', 'signup']);

export const getEmailOtpType = (value) => {
  const type = String(value || '').trim().toLowerCase();
  return PASSWORD_SETUP_TYPES.has(type) ? type : null;
};

export const safeNextPath = (value, fallback = '/admin') => (
  value?.startsWith('/') && !value.startsWith('//') ? value : fallback
);

export const getEmailFlowNext = (type, requestedNext) => safeNextPath(
  requestedNext,
  PASSWORD_SETUP_TYPES.has(type) ? '/reset-password' : '/admin'
);
