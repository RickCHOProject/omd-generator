import { sanitizePublicDealData, normalizeDealSlug } from './publicDeal.mjs';
import { supabaseServerFetch } from './supabaseServer';

export async function getPublicDealRecord(value) {
  const slug = normalizeDealSlug(value);
  if (!slug) return null;

  const response = await supabaseServerFetch(
    `/rest/v1/deals?slug=eq.${encodeURIComponent(slug)}&select=id,slug,data&limit=1`
  );
  if (!response.ok) return null;

  const rows = await response.json();
  const row = rows?.[0];
  const data = sanitizePublicDealData(row?.data);
  return row && data ? { id: row.id, slug: row.slug, data } : null;
}
