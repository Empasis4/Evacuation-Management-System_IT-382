// ============================================================
// API Route: POST /api/alerts/trigger
// Allows manual alert dispatch by authorized admins
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { sendBulkSms } from '@/lib/sms-service';
import { createServiceClient } from '@/lib/supabase/server';
import { AlertLevel, Barangay } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { alert_level, message, affected_barangay_ids } = await req.json() as {
      alert_level: AlertLevel;
      message: string;
      affected_barangay_ids?: string[];
    };

    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    const supabase = createServiceClient();

    // Fetch target barangays
    const query = supabase.from('barangays').select('*');
    if (affected_barangay_ids?.length) query.in('id', affected_barangay_ids);
    const { data: barangays } = await query;

    // Insert alert record
    const { data: alert } = await supabase
      .from('alerts')
      .insert({ alert_level, message, triggered_by: 'manual_dispatch', affected_barangays: barangays ?? [] })
      .select().single();

    // Dispatch SMS
    const recipients = (barangays as Barangay[] ?? []).flatMap((b: Barangay) =>
      b.contact_numbers.map((n: string) => ({ number: n, barangayId: b.id }))
    );
    const smsResults = await sendBulkSms(recipients, message);

    await supabase.from('sms_logs').insert(
      smsResults.map((r, i) => ({
        barangay_id:       recipients[i].barangayId,
        alert_id:          alert?.id,
        recipient_number:  r.number,
        message,
        status:            r.status,
        provider_response: r.response,
      }))
    );

    return NextResponse.json({ success: true, alert, smsCount: recipients.length });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

// GET /api/alerts/trigger → returns alert history
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('alerts').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alerts: data });
}
