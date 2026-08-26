import { NextResponse } from 'next/server';
import { getStaffSession } from '../../../../lib/serverAuth';
import { supabaseServerFetch } from '../../../../lib/supabaseServer';

const unauthorized = () => NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 });

export async function GET() {
  if (!await getStaffSession()) return unauthorized();
  const response = await supabaseServerFetch('/rest/v1/deals?select=*&order=created_at.desc');
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function PATCH(request) {
  if (!await getStaffSession()) return unauthorized();
  const { id, data } = await request.json();
  if (!Number.isInteger(Number(id)) || !data || typeof data !== 'object') {
    return NextResponse.json({ error: 'A valid deal and update are required.' }, { status: 400 });
  }

  const response = await supabaseServerFetch(`/rest/v1/deals?id=eq.${Number(id)}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify({ data, updated_at: new Date().toISOString() })
  });
  const result = await response.json();
  return NextResponse.json(result, { status: response.status });
}

export async function DELETE(request) {
  if (!await getStaffSession()) return unauthorized();
  const { id } = await request.json();
  if (!Number.isInteger(Number(id))) {
    return NextResponse.json({ error: 'A valid deal is required.' }, { status: 400 });
  }

  const response = await supabaseServerFetch(`/rest/v1/deals?id=eq.${Number(id)}`, {
    method: 'DELETE',
    prefer: 'return=minimal'
  });
  if (!response.ok) {
    return NextResponse.json({ error: 'The deal could not be deleted.' }, { status: response.status });
  }
  return NextResponse.json({ ok: true });
}
