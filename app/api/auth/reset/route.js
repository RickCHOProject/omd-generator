import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '../../../../lib/supabaseAuthServer';
import { DEFAULT_OWNER_EMAIL, getOMDAccess, normalizeEmail } from '../../../../lib/staffAccess.mjs';

export async function POST(request) {
  const { email = '' } = await request.json();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedEmail) {
    return NextResponse.json({ error: 'Enter your email address.' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  let approved = false;
  if (admin) {
    let page = 1;
    while (!approved) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const batch = data?.users || [];
      const user = batch.find((item) => normalizeEmail(item.email) === normalizedEmail);
      if (user) {
        approved = Boolean(getOMDAccess(user, process.env.OMD_OWNER_EMAIL || DEFAULT_OWNER_EMAIL));
        break;
      }
      if (batch.length < 200) break;
      page += 1;
    }
  }

  if (approved) {
    const supabase = await createSupabaseAuthClient();
    const redirectTo = `${new URL(request.url).origin}/auth/callback?next=/reset-password`;
    await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
  }

  return NextResponse.json({
    ok: true,
    message: 'If that email has OMD access, a password reset link is on the way.'
  });
}
