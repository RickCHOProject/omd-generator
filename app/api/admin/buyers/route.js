import { NextResponse } from 'next/server';
import { getStaffSession } from '../../../../lib/serverAuth';
import { supabaseServerFetch } from '../../../../lib/supabaseServer';

export async function GET() {
  if (!await getStaffSession()) {
    return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 });
  }
  const response = await supabaseServerFetch('/rest/v1/buyer_signups?select=*&order=created_at.desc');
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
