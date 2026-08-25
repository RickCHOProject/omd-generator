export const ANALYTICS_EVENT_PREFIX = 'omd:event:';
export const ANALYTICS_EVENT_TYPES = Object.freeze(['view', 'call', 'text', 'interested']);

export const emptyDealAnalytics = () => ({
  views: 0,
  uniqueVisitors: 0,
  repeatVisitors: 0,
  viewsPerVisitor: 0,
  callClicks: 0,
  textClicks: 0,
  interestedClicks: 0,
  totalClicks: 0
});

export const encodeEventReferrer = (eventType) => {
  if (!ANALYTICS_EVENT_TYPES.includes(eventType) || eventType === 'view') return null;
  return `${ANALYTICS_EVENT_PREFIX}${eventType}`;
};

export const getRowEventType = (row = {}) => {
  if (typeof row.referrer !== 'string' || !row.referrer.startsWith(ANALYTICS_EVENT_PREFIX)) return 'view';
  const eventType = row.referrer.slice(ANALYTICS_EVENT_PREFIX.length);
  return ANALYTICS_EVENT_TYPES.includes(eventType) ? eventType : 'view';
};

export const isPageViewRow = (row) => getRowEventType(row) === 'view';

export async function collectPaginatedRows(loadPage, pageSize = 1000) {
  const rows = [];
  let offset = 0;

  while (true) {
    const page = await loadPage({ offset, limit: pageSize });
    if (!Array.isArray(page)) throw new Error('Analytics source returned an invalid page.');
    rows.push(...page);
    if (page.length < pageSize) return rows;
    offset += pageSize;
  }
}

export function summarizeAnalyticsRows(rows = []) {
  const byDeal = {};
  const visitorCounts = {};

  for (const row of rows) {
    const slug = row?.deal_slug;
    if (!slug) continue;
    if (!byDeal[slug]) byDeal[slug] = emptyDealAnalytics();
    if (!visitorCounts[slug]) visitorCounts[slug] = {};

    const eventType = getRowEventType(row);
    if (eventType === 'view') {
      byDeal[slug].views += 1;
      if (row.visitor_id) {
        visitorCounts[slug][row.visitor_id] = (visitorCounts[slug][row.visitor_id] || 0) + 1;
      }
    } else {
      byDeal[slug][`${eventType}Clicks`] += 1;
      byDeal[slug].totalClicks += 1;
    }
  }

  for (const [slug, visitors] of Object.entries(visitorCounts)) {
    const counts = Object.values(visitors);
    byDeal[slug].uniqueVisitors = counts.length;
    byDeal[slug].repeatVisitors = counts.filter((count) => count > 1).length;
    byDeal[slug].viewsPerVisitor = counts.length ? Number((byDeal[slug].views / counts.length).toFixed(1)) : 0;
  }

  const totals = Object.values(byDeal).reduce((total, deal) => {
    total.views += deal.views;
    total.callClicks += deal.callClicks;
    total.textClicks += deal.textClicks;
    total.interestedClicks += deal.interestedClicks;
    total.totalClicks += deal.totalClicks;
    return total;
  }, { views: 0, callClicks: 0, textClicks: 0, interestedClicks: 0, totalClicks: 0 });

  return { totals, byDeal };
}

export function buildAnalyticsPayload(rows = [], requestedSlug = '') {
  const { totals, byDeal } = summarizeAnalyticsRows(rows);
  const pageViews = requestedSlug ? rows.filter(isPageViewRow) : [];
  const events = requestedSlug
    ? rows.filter((row) => !isPageViewRow(row)).map((row) => ({ ...row, eventType: getRowEventType(row) }))
    : [];

  return {
    totals,
    byDeal,
    deal: requestedSlug ? (byDeal[requestedSlug] || emptyDealAnalytics()) : null,
    pageViews,
    events
  };
}
