import { NextResponse } from 'next/server';
import { createSupabaseAuthClient } from '../../../../lib/supabaseAuthServer';
import { isSameOriginRequest } from '../../../../lib/requestSecurity.mjs';

export async function POST(request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  const supabase = await createSupabaseAuthClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url), 303);
}
