import { isPublicDeal } from './dealRecord.mjs';

const PUBLIC_DEAL_FIELDS = Object.freeze([
  'address',
  'city',
  'state',
  'zip',
  'askingPrice',
  'arv',
  'beds',
  'baths',
  'sqft',
  'yearBuilt',
  'lotSize',
  'occupancy',
  'access',
  'coe',
  'emd',
  'hoa',
  'conditionNotes',
  'phone',
  'omdStatus'
]);

export const normalizeDealSlug = (value) => {
  const slug = typeof value === 'string' ? value.trim() : '';
  return slug && slug.length <= 180 && /^[a-zA-Z0-9_-]+$/.test(slug) ? slug : '';
};

const cleanPhoto = (photo) => {
  if (!photo || typeof photo !== 'object' || typeof photo.url !== 'string') return null;
  const url = photo.url.trim();
  if (!/^https:\/\//i.test(url) || url.length > 2048) return null;
  return {
    url,
    label: typeof photo.label === 'string' ? photo.label.trim().slice(0, 120) : ''
  };
};

export const sanitizePublicDealData = (data) => {
  if (!isPublicDeal(data)) return null;
  const safe = {};
  for (const field of PUBLIC_DEAL_FIELDS) {
    if (data[field] !== undefined && data[field] !== null) safe[field] = data[field];
  }
  safe.photos = Array.isArray(data.photos) ? data.photos.map(cleanPhoto).filter(Boolean).slice(0, 100) : [];
  return safe;
};

const cleanText = (value, maxLength) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

export const buildPublicLeadRecord = (input = {}) => {
  const dealSlug = normalizeDealSlug(input.dealSlug);
  const name = cleanText(input.name, 120);
  const email = cleanText(input.email, 254).toLowerCase();
  const phone = cleanText(input.phone, 40);
  const visitorId = cleanText(input.visitorId, 120);

  if (!dealSlug || (!name && !email)) return null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  return {
    deal_slug: dealSlug,
    visitor_id: visitorId || null,
    name: name || null,
    email: email || null,
    phone: phone || null
  };
};
