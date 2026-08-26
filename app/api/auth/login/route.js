import { NextResponse } from 'next/server';
import {
  createSessionToken,
  hashPassword,
  parseStaffUsers,
  SESSION_COOKIE,
  SESSION_DURATION_SECONDS
} from '../../../../lib/auth';

const valuesMatch = (left, right) => {
  if (!left || !right || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
};

export async function POST(request) {
  const sessionSecret = process.env.OMD_SESSION_SECRET;
  const staffUsers = parseStaffUsers(process.env.OMD_STAFF_USERS_JSON);

  const legacyUsername = process.env.OMD_LOGIN_USERNAME?.trim().toLowerCase();
  const legacyPasswordHash = process.env.OMD_LOGIN_PASSWORD_SHA256?.trim().toLowerCase();
  if (legacyUsername && legacyPasswordHash && !staffUsers[legacyUsername]) {
    staffUsers[legacyUsername] = {
      username: legacyUsername,
      displayName: legacyUsername,
      passwordHash: legacyPasswordHash
    };
  }

  if (!Object.keys(staffUsers).length || !sessionSecret) {
    return NextResponse.json({ error: 'Staff login has not been configured yet.' }, { status: 503 });
  }

  const { username = '', password = '' } = await request.json();
  const normalizedUsername = username.trim().toLowerCase();
  const submittedPasswordHash = await hashPassword(password);
  const account = staffUsers[normalizedUsername];

  if (!account || !valuesMatch(submittedPasswordHash, account.passwordHash)) {
    return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 });
  }

  const token = await createSessionToken(normalizedUsername, sessionSecret, { name: account.displayName });
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS
  });
  return response;
}
