import { NextResponse } from 'next/server';
import { getStaffSession } from '../../../../lib/serverAuth';
import { supabaseServerFetch } from '../../../../lib/supabaseServer';
import { auditNewDealData, auditUpdatedDealData } from '../../../../lib/dealAudit.mjs';
import { isOwner } from '../../../../lib/staffAccess.mjs';

const unauthorized = () => NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 });

export async function GET() {
  const session = await getStaffSession();
  if (!session) return unauthorized();
  const response = await supabaseServerFetch('/rest/v1/deals?select=*&order=created_at.desc');
  const data = await response.json();
  const visibleData = response.ok && !isOwner(session)
    ? data.filter((deal) => deal?.data?.audit?.archived !== true)
    : data;
  return NextResponse.json(visibleData, { status: response.status });
}

export async function POST(request) {
  const session = await getStaffSession();
  if (!session) return unauthorized();
  const { slug, data } = await request.json();
  if (!slug || typeof slug !== 'string' || slug.length > 180 || !data || typeof data !== 'object') {
    return NextResponse.json({ error: 'A valid deal record is required.' }, { status: 400 });
  }

  const response = await supabaseServerFetch('/rest/v1/deals', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({ slug, data: auditNewDealData(data, session) })
  });
  const result = await response.json();
  return NextResponse.json(result, { status: response.status });
}

export async function PATCH(request) {
  const session = await getStaffSession();
  if (!session) return unauthorized();
  const { id, data } = await request.json();
  if (!Number.isInteger(Number(id)) || !data || typeof data !== 'object') {
    return NextResponse.json({ error: 'A valid deal and update are required.' }, { status: 400 });
  }

  const currentResponse = await supabaseServerFetch(`/rest/v1/deals?id=eq.${Number(id)}&select=data&limit=1`);
  const currentRows = await currentResponse.json();
  if (!currentResponse.ok || !currentRows?.[0]) {
    return NextResponse.json({ error: 'The deal could not be found.' }, { status: 404 });
  }

  if (currentRows[0].data?.audit?.archived === true && !isOwner(session)) {
    return NextResponse.json({ error: 'Only the Owner can edit an archived deal.' }, { status: 403 });
  }

  const archiveChanged = Boolean(currentRows[0].data?.audit?.archived) !== Boolean(data?.audit?.archived);
  if (archiveChanged && !isOwner(session)) {
    return NextResponse.json({ error: 'Only the Owner can archive or restore a deal.' }, { status: 403 });
  }

  const response = await supabaseServerFetch(`/rest/v1/deals?id=eq.${Number(id)}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify({
      data: auditUpdatedDealData(data, currentRows[0].data, session),
      updated_at: new Date().toISOString()
    })
  });
  const result = await response.json();
  return NextResponse.json(result, { status: response.status });
}

export async function DELETE(request) {
  const session = await getStaffSession();
  if (!session) return unauthorized();
  if (!isOwner(session)) {
    return NextResponse.json({ error: 'Only the Owner can permanently delete a deal.' }, { status: 403 });
  }
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
