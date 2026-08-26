import { NextResponse } from 'next/server';
import { getStaffSession } from '../../../../lib/serverAuth';

export async function GET() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 });
  return NextResponse.json({ username: session.sub, displayName: session.name || session.sub });
}
