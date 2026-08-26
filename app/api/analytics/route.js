import { NextResponse } from 'next/server';
import {
  ANALYTICS_EVENT_TYPES,
  buildAnalyticsPayload,
  collectPaginatedRows,
  encodeEventReferrer
} from '../../../lib/analytics.mjs';
import { getStaffSession } from '../../../lib/serverAuth';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = 'https://wqvfsynpxfwacesvjlmd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L0SuigrNUZpsWC66KSVCOA_EuypYe5i';
const PRODUCTION_HOST = 'deals.offmarketdaily.com';
const PAGE_SIZE = 1000;

const supabaseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

const cleanText = (value, maxLength) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const fetchAnalyticsRows = async (slug = '') => collectPaginatedRows(async ({ offset, limit }) => {
  const params = new URLSearchParams({
    select: 'deal_slug,visitor_id,referrer,user_agent,viewed_at',
    order: 'viewed_at.desc',
    limit: String(limit),
    offset: String(offset)
  });
  if (slug) params.set('deal_slug', `eq.${slug}`);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/deal_views?${params}`, {
    headers: supabaseHeaders,
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`Analytics read failed with status ${response.status}.`);
  return response.json();
}, PAGE_SIZE);

export async function GET(request) {
  if (!await getStaffSession()) {
    return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 });
  }
  try {
    const slug = cleanText(new URL(request.url).searchParams.get('slug'), 160);
    const rows = await fetchAnalyticsRows(slug);
    return NextResponse.json(buildAnalyticsPayload(rows, slug), {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('Analytics read failed:', error);
    return NextResponse.json({ error: 'Analytics are temporarily unavailable.' }, { status: 502 });
  }
}

export async function POST(request) {
  try {
    const requestHost = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(':')[0];
    const body = await request.json();
    const eventType = cleanText(body.eventType, 20);
    const dealSlug = cleanText(body.dealSlug, 160);

    if (requestHost !== PRODUCTION_HOST) {
      return NextResponse.json({ tracked: false, skipped: 'non-production' });
    }
    if (!ANALYTICS_EVENT_TYPES.includes(eventType) || !dealSlug) {
      return NextResponse.json({ error: 'A valid deal and event are required.' }, { status: 400 });
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/deal_views`, {
      method: 'POST',
      headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
      cache: 'no-store',
      body: JSON.stringify({
        deal_slug: dealSlug,
        visitor_id: cleanText(body.visitorId, 120) || null,
        referrer: eventType === 'view' ? (cleanText(body.referrer, 500) || null) : encodeEventReferrer(eventType),
        user_agent: cleanText(body.userAgent, 500) || null
      })
    });

    if (!response.ok) throw new Error(`Analytics write failed with status ${response.status}.`);
    return NextResponse.json({ tracked: true });
  } catch (error) {
    console.error('Analytics write failed:', error);
    return NextResponse.json({ error: 'Analytics could not be recorded.' }, { status: 502 });
  }
}
