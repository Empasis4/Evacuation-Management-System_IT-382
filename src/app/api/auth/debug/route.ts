import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: !!process.env.SUPABASE_SECRET_KEY,
    url_val: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 10) + '...',
  });
}
