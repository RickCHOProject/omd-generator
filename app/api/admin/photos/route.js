import { NextResponse } from 'next/server';
import { getStaffSession } from '../../../../lib/serverAuth';
import { isJpegBytes } from '../../../../lib/imageValidation.mjs';
import { supabaseServerFetch } from '../../../../lib/supabaseServer';

const SUPABASE_PUBLIC_STORAGE = 'https://wqvfsynpxfwacesvjlmd.supabase.co/storage/v1/object/public/deal-photos';

export async function POST(request) {
  if (!await getStaffSession()) {
    return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 });
  }

  const fileName = new URL(request.url).searchParams.get('fileName')?.trim();
  if (!fileName || fileName.includes('..') || !/^[a-zA-Z0-9/_-]+\.jpg$/.test(fileName)) {
    return NextResponse.json({ error: 'A valid photo name is required.' }, { status: 400 });
  }

  const image = await request.arrayBuffer();
  if (!image.byteLength || image.byteLength > 12 * 1024 * 1024) {
    return NextResponse.json({ error: 'The photo must be smaller than 12 MB.' }, { status: 400 });
  }
  if (!isJpegBytes(image)) {
    return NextResponse.json({ error: 'The photo must be a valid JPEG image.' }, { status: 400 });
  }

  const response = await supabaseServerFetch(`/storage/v1/object/deal-photos/${fileName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: image
  });
  if (!response.ok) {
    return NextResponse.json({ error: 'The photo could not be uploaded.' }, { status: response.status });
  }
  return NextResponse.json({ url: `${SUPABASE_PUBLIC_STORAGE}/${fileName}` });
}
