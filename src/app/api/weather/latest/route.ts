import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServiceClient();
    
    // Fetch the latest weather log
    const { data, error } = await supabase
      .from('weather_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    return NextResponse.json(data?.[0] || null);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
