export const CONTACT_NUMBERS = Object.freeze([
  { state: 'FL', label: 'Florida', phone: '904-664-8890', primary: true },
  { state: 'AZ', label: 'Arizona primary', phone: '480-685-8477', primary: true },
  { state: 'AZ', label: 'Arizona backup', phone: '928-938-3822', primary: false },
  { state: 'GA', label: 'Georgia', phone: '470-664-5752', primary: true },
  { state: 'TX', label: 'Texas', phone: '214-612-5707', primary: true },
  { state: 'NC', label: 'North Carolina', phone: '980-351-1529', primary: true },
  { state: 'CO', label: 'Colorado', phone: '719-563-8369', primary: true }
]);

const STATE_ALIASES = Object.freeze({
  florida: 'FL',
  arizona: 'AZ',
  georgia: 'GA',
  texas: 'TX',
  'north carolina': 'NC',
  colorado: 'CO'
});

export const normalizeStateCode = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.length === 2) return normalized.toUpperCase();
  return STATE_ALIASES[normalized] || '';
};

export const getPrimaryPhoneForState = (state) => {
  const code = normalizeStateCode(state);
  return CONTACT_NUMBERS.find((entry) => entry.state === code && entry.primary)?.phone || '';
};

export const getPhoneChoicesForState = (state) => {
  const code = normalizeStateCode(state);
  const stateChoices = CONTACT_NUMBERS.filter((entry) => entry.state === code);
  return stateChoices.length ? stateChoices : CONTACT_NUMBERS.filter((entry) => entry.primary);
};

export const getApprovedPhoneForState = (state, savedPhone = '') => {
  const choices = getPhoneChoicesForState(state);
  const normalizedSavedPhone = String(savedPhone || '').trim();
  if (choices.some((entry) => entry.phone === normalizedSavedPhone)) return normalizedSavedPhone;
  return getPrimaryPhoneForState(state);
};

export const applyStatePhone = (deal) => ({
  ...deal,
  phone: getPrimaryPhoneForState(deal?.state)
});
