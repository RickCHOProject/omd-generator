import { NextResponse } from 'next/server';
import { getStaffSession } from '../../../../lib/serverAuth';
import { supabaseServerFetch } from '../../../../lib/supabaseServer';
import { collectPaginatedRows } from '../../../../lib/analytics.mjs';

const PAGE_SIZE = 1000;

export async function GET(request) {
  if (!await getStaffSession()) {
    return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 });
  }

  const slug = new URL(request.url).searchParams.get('slug')?.trim();
  if (slug?.length > 160) {
    return NextResponse.json({ error: 'A valid deal is required.' }, { status: 400 });
  }

  if (slug) {
    const response = await supabaseServerFetch(`/rest/v1/deal_leads?deal_slug=eq.${encodeURIComponent(slug)}&select=*&order=created_at.desc`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  }

  try {
    const leads = await collectPaginatedRows(async ({ offset, limit }) => {
      const response = await supabaseServerFetch(`/rest/v1/deal_leads?select=deal_slug&limit=${limit}&offset=${offset}`);
      if (!response.ok) throw new Error(`Lead summary failed with status ${response.status}.`);
      return response.json();
    }, PAGE_SIZE);
    const byDeal = leads.reduce((counts, lead) => {
      if (lead?.deal_slug) counts[lead.deal_slug] = (counts[lead.deal_slug] || 0) + 1;
      return counts;
    }, {});
    return NextResponse.json({ total: leads.length, byDeal });
  } catch (error) {
    console.error('Lead summary failed:', error);
    return NextResponse.json({ error: 'Lead totals are temporarily unavailable.' }, { status: 502 });
  }
}
