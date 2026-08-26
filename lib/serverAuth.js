import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySessionToken } from './auth';

export const getStaffSession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const secret = process.env.OMD_SESSION_SECRET;
  if (!token || !secret) return null;
  return verifySessionToken(token, secret);
};
