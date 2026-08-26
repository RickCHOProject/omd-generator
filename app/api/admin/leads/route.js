import { NextResponse } from 'next/server';
import { getStaffSession } from '../../../../lib/serverAuth';
import { supabaseServerFetch } from '../../../../lib/supabaseServer';

export async function GET(request) {
  if (!await getStaffSession()) {
    return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 });
  }

  const slug = new URL(request.url).searchParams.get('slug')?.trim();
  if (!slug || slug.length > 160) {
    return NextResponse.json({ error: 'A valid deal is required.' }, { status: 400 });
  }

  const response = await supabaseServerFetch(`/rest/v1/deal_leads?deal_slug=eq.${encodeURIComponent(slug)}&select=*&order=created_at.desc`);
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
