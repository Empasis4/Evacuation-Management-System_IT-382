// ============================================================
// API Route: POST /api/sms/send
// Manual SMS dispatch endpoint with full logging
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { sendBulkSms } from '@/lib/sms-service';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { numbers, message, alert_id } = await req.json() as {
      numbers: string[];
      message: string;
      alert_id?: string;
    };

    if (!numbers?.length || !message)
      return NextResponse.json({ error: 'numbers[] and message are required' }, { status: 400 });

    const recipients = numbers.map(n => ({ number: n }));
    const results = await sendBulkSms(recipients, message);

    // Log results to Supabase
    const supabase = createServiceClient();
    await supabase.from('sms_logs').insert(
      results.map(r => ({
        recipient_number: r.number,
        message,
        status:           r.status,
        provider_response: r.response,
        alert_id:         alert_id ?? null,
      }))
    );

    const sent   = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({ success: true, sent, failed, results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
