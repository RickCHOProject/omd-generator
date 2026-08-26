import { NextResponse } from 'next/server';
import {
  createSessionToken,
  hashPassword,
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
  const allowedUsername = process.env.OMD_LOGIN_USERNAME?.trim().toLowerCase();
  const expectedPasswordHash = process.env.OMD_LOGIN_PASSWORD_SHA256?.trim().toLowerCase();
  const sessionSecret = process.env.OMD_SESSION_SECRET;

  if (!allowedUsername || !expectedPasswordHash || !sessionSecret) {
    return NextResponse.json({ error: 'Staff login has not been configured yet.' }, { status: 503 });
  }

  const { username = '', password = '' } = await request.json();
  const normalizedUsername = username.trim().toLowerCase();
  const submittedPasswordHash = await hashPassword(password);

  if (!valuesMatch(normalizedUsername, allowedUsername) || !valuesMatch(submittedPasswordHash, expectedPasswordHash)) {
    return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 });
  }

  const token = await createSessionToken(normalizedUsername, sessionSecret);
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
