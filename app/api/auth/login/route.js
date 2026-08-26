import { NextResponse } from 'next/server';
import { createSupabaseAuthClient } from '../../../../lib/supabaseAuthServer';
import { DEFAULT_OWNER_EMAIL, getOMDAccess } from '../../../../lib/staffAccess.mjs';
import { getRequestIp, publicRateLimit } from '../../../../lib/publicRateLimit.mjs';
import { isSameOriginRequest } from '../../../../lib/requestSecurity.mjs';

export async function POST(request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  const allowed = publicRateLimit({ key: `login:${getRequestIp(request)}`, limit: 10, windowMs: 15 * 60 * 1000 });
  if (!allowed) return NextResponse.json({ error: 'Too many sign-in attempts. Please wait and try again.' }, { status: 429 });
  const { email = '', password = '' } = await request.json();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
  }

  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });

  if (error || !data.user) {
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  }

  const session = getOMDAccess(data.user, process.env.OMD_OWNER_EMAIL || DEFAULT_OWNER_EMAIL);
  if (!session) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: 'This account does not have access to OMD.' }, { status: 403 });
  }

  return NextResponse.json({ ok: true, role: session.role });
}
