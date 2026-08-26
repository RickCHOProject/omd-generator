import { NextResponse } from 'next/server';
import { buildPublicLeadRecord } from '../../../../lib/publicDeal.mjs';
import { getPublicDealRecord } from '../../../../lib/publicDealServer';
import { getRequestIp, publicRateLimit } from '../../../../lib/publicRateLimit.mjs';
import { supabaseServerFetch } from '../../../../lib/supabaseServer';

const PRODUCTION_HOST = 'deals.offmarketdaily.com';

export async function POST(request) {
  try {
    const requestHost = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(':')[0];
    if (requestHost !== PRODUCTION_HOST) {
      return NextResponse.json({ submitted: false, skipped: 'non-production' });
    }

    const record = buildPublicLeadRecord(await request.json());
    if (!record) return NextResponse.json({ error: 'Enter a valid name and email.' }, { status: 400 });

    const allowed = publicRateLimit({
      key: `lead:${getRequestIp(request)}:${record.deal_slug}`,
      limit: 5,
      windowMs: 60 * 60 * 1000
    });
    if (!allowed) return NextResponse.json({ error: 'Please try again later.' }, { status: 429 });

    if (!await getPublicDealRecord(record.deal_slug)) {
      return NextResponse.json({ error: 'Deal not found.' }, { status: 404 });
    }

    const response = await supabaseServerFetch('/rest/v1/deal_leads', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify(record)
    });
    if (!response.ok) throw new Error(`Lead write failed with status ${response.status}.`);
    return NextResponse.json({ submitted: true });
  } catch (error) {
    console.error('Public lead submission failed:', error);
    return NextResponse.json({ error: 'Your information could not be saved.' }, { status: 502 });
  }
}
