import { NextResponse } from 'next/server';
import { getEmailFlowNext, getEmailOtpType } from '../../../lib/authEmailFlow.mjs';
import { createSupabaseAuthClient } from '../../../lib/supabaseAuthServer';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = getEmailOtpType(url.searchParams.get('type'));
  const next = getEmailFlowNext(type, url.searchParams.get('next'));

  if (tokenHash && type) {
    const supabase = await createSupabaseAuthClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  if (code) {
    const supabase = await createSupabaseAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  const loginUrl = new URL('/login', url.origin);
  loginUrl.searchParams.set('error', 'That email link is invalid or has expired. Please request a new one.');
  return NextResponse.redirect(loginUrl);
}
