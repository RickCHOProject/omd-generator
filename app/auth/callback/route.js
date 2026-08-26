import { NextResponse } from 'next/server';
import { createSupabaseAuthClient } from '../../../lib/supabaseAuthServer';

const safeNextPath = (value) => value?.startsWith('/') && !value.startsWith('//')
  ? value
  : '/admin';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next'));

  if (code) {
    const supabase = await createSupabaseAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  const loginUrl = new URL('/login', url.origin);
  loginUrl.searchParams.set('error', 'That email link is invalid or has expired. Please request a new one.');
  return NextResponse.redirect(loginUrl);
}
