import { NextResponse } from 'next/server';
import { createSupabaseAuthClient } from '../../../../lib/supabaseAuthServer';
import { DEFAULT_OWNER_EMAIL, getOMDAccess } from '../../../../lib/staffAccess.mjs';
import { isSameOriginRequest } from '../../../../lib/requestSecurity.mjs';

export async function POST(request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  const { password = '' } = await request.json();
  if (String(password).length < 10) {
    return NextResponse.json({ error: 'Use at least 10 characters.' }, { status: 400 });
  }

  const supabase = await createSupabaseAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  const access = getOMDAccess(user, process.env.OMD_OWNER_EMAIL || DEFAULT_OWNER_EMAIL);
  if (!access) {
    return NextResponse.json({ error: 'This setup link is invalid or has expired.' }, { status: 401 });
  }

  const { error } = await supabase.auth.updateUser({ password: String(password) });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
