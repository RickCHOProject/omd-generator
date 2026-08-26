import { NextResponse } from 'next/server';
import { getOwnerSession } from '../../../../lib/serverAuth';
import { createSupabaseAdminClient } from '../../../../lib/supabaseAuthServer';
import { DEFAULT_OWNER_EMAIL, formatDisplayName, isFullDisplayName, normalizeEmail, OMD_ROLES } from '../../../../lib/staffAccess.mjs';
import { isSameOriginRequest } from '../../../../lib/requestSecurity.mjs';

const unauthorized = () => NextResponse.json({ error: 'Owner access is required.' }, { status: 403 });

const requireAdminClient = () => {
  const client = createSupabaseAdminClient();
  return client || null;
};

const memberRecord = (user, ownerEmail) => {
  const email = normalizeEmail(user.email);
  const isOwner = email === normalizeEmail(ownerEmail);
  return {
    id: user.id,
    email,
    displayName: formatDisplayName(user.user_metadata?.display_name || user.user_metadata?.full_name || email.split('@')[0]),
    role: isOwner ? OMD_ROLES.OWNER : OMD_ROLES.STAFF,
    active: isOwner || user.app_metadata?.omd_active !== false,
    invitedAt: user.invited_at || user.created_at || null,
    lastSignInAt: user.last_sign_in_at || null
  };
};

export async function GET() {
  if (!await getOwnerSession()) return unauthorized();
  const supabase = requireAdminClient();
  if (!supabase) return NextResponse.json({ error: 'Staff management is not configured yet.' }, { status: 503 });

  const ownerEmail = process.env.OMD_OWNER_EMAIL || DEFAULT_OWNER_EMAIL;
  const members = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return NextResponse.json({ error: 'Team access could not be loaded.' }, { status: 502 });
    const batch = data?.users || [];
    members.push(...batch
      .filter((user) => normalizeEmail(user.email) === normalizeEmail(ownerEmail) || user.app_metadata?.omd_role === OMD_ROLES.STAFF)
      .map((user) => memberRecord(user, ownerEmail)));
    if (batch.length < 200) break;
    page += 1;
  }

  members.sort((left, right) => left.role === OMD_ROLES.OWNER ? -1 : right.role === OMD_ROLES.OWNER ? 1 : left.displayName.localeCompare(right.displayName));
  return NextResponse.json(members);
}

export async function POST(request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  if (!await getOwnerSession()) return unauthorized();
  const supabase = requireAdminClient();
  if (!supabase) return NextResponse.json({ error: 'Staff management is not configured yet.' }, { status: 503 });

  const { email = '', displayName = '' } = await request.json();
  const normalizedEmail = normalizeEmail(email);
  const cleanName = formatDisplayName(displayName);
  if (!normalizedEmail || !isFullDisplayName(cleanName)) {
    return NextResponse.json({ error: 'Enter the staff member’s full name and email.' }, { status: 400 });
  }
  if (normalizedEmail === normalizeEmail(process.env.OMD_OWNER_EMAIL || DEFAULT_OWNER_EMAIL)) {
    return NextResponse.json({ error: 'The Owner account already has access.' }, { status: 400 });
  }

  let existingUser = null;
  let page = 1;
  while (!existingUser) {
    const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (listError) return NextResponse.json({ error: 'Existing accounts could not be checked.' }, { status: 502 });
    const batch = listed?.users || [];
    existingUser = batch.find((user) => normalizeEmail(user.email) === normalizedEmail) || null;
    if (existingUser || batch.length < 200) break;
    page += 1;
  }

  if (existingUser) {
    const { data: updatedExisting, error: existingError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      app_metadata: {
        ...existingUser.app_metadata,
        omd_role: OMD_ROLES.STAFF,
        omd_active: true
      },
      user_metadata: {
        ...existingUser.user_metadata,
        display_name: cleanName,
        full_name: cleanName
      }
    });
    if (existingError) return NextResponse.json({ error: 'That existing account could not be approved.' }, { status: 502 });
    return NextResponse.json({
      ...memberRecord(updatedExisting.user, process.env.OMD_OWNER_EMAIL || DEFAULT_OWNER_EMAIL),
      inviteSent: false,
      existingAccount: true
    });
  }

  const redirectTo = `${new URL(request.url).origin}/auth/callback?next=/reset-password`;
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo,
    data: { display_name: cleanName, full_name: cleanName }
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || 'The invitation could not be sent.' }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(data.user.id, {
    app_metadata: {
      ...data.user.app_metadata,
      omd_role: OMD_ROLES.STAFF,
      omd_active: true
    },
    user_metadata: {
      ...data.user.user_metadata,
      display_name: cleanName,
      full_name: cleanName
    }
  });
  if (updateError) {
    return NextResponse.json({ error: 'The invitation was sent, but OMD access could not be activated.' }, { status: 502 });
  }

  return NextResponse.json({
    ...memberRecord(updated.user, process.env.OMD_OWNER_EMAIL || DEFAULT_OWNER_EMAIL),
    inviteSent: true,
    existingAccount: false
  });
}

export async function PATCH(request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  if (!await getOwnerSession()) return unauthorized();
  const supabase = requireAdminClient();
  if (!supabase) return NextResponse.json({ error: 'Staff management is not configured yet.' }, { status: 503 });

  const { id = '', active } = await request.json();
  if (!id || typeof active !== 'boolean') {
    return NextResponse.json({ error: 'A valid staff access change is required.' }, { status: 400 });
  }

  const { data: current, error: currentError } = await supabase.auth.admin.getUserById(id);
  if (currentError || !current.user) return NextResponse.json({ error: 'That staff member could not be found.' }, { status: 404 });
  const ownerEmail = process.env.OMD_OWNER_EMAIL || DEFAULT_OWNER_EMAIL;
  if (normalizeEmail(current.user.email) === normalizeEmail(ownerEmail)) {
    return NextResponse.json({ error: 'The Owner account cannot be deactivated.' }, { status: 400 });
  }

  const { data, error } = await supabase.auth.admin.updateUserById(id, {
    app_metadata: {
      ...current.user.app_metadata,
      omd_role: OMD_ROLES.STAFF,
      omd_active: active
    }
  });
  if (error) return NextResponse.json({ error: 'Staff access could not be updated.' }, { status: 502 });
  return NextResponse.json(memberRecord(data.user, ownerEmail));
}
