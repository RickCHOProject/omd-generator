export const PUBLIC_DEAL_ORIGIN = 'https://deals.offmarketdaily.com';

export const getPublicDealUrl = (slug) => `${PUBLIC_DEAL_ORIGIN}/d/${encodeURIComponent(slug)}`;
