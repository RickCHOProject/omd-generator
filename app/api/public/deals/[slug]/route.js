import { NextResponse } from 'next/server';
import { getPublicDealRecord } from '../../../../../lib/publicDealServer';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { slug } = await params;
  const deal = await getPublicDealRecord(slug);
  if (!deal) {
    return NextResponse.json({ error: 'Deal not found.' }, {
      status: 404,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
  return NextResponse.json(deal, { headers: { 'Cache-Control': 'no-store' } });
}
