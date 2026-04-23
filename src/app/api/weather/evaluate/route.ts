// ============================================================
// API Route: POST /api/weather/evaluate
// Runs the full weather → alert evaluation pipeline:
//   1. Fetch weather
//   2. Load thresholds from system_settings
//   3. Run alert engine
//   4. If alert level ≥ 1, create alert + dispatch SMS
// ============================================================

import { NextResponse } from 'next/server';
import { fetchButuanWeather } from '@/lib/weather-service';
import { evaluateWeatherConditions, AlertThresholds } from '@/lib/alert-engine';
import { sendBulkSms, formatSirenMessage } from '@/lib/sms-service';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = createServiceClient();

    // 1. Fetch current weather
    const weather = await fetchButuanWeather();

    // 2. Load thresholds from DB (fallback to defaults)
    const { data: settingsRows } = await supabase.from('system_settings').select('key, value');
    const settings = Object.fromEntries((settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, parseFloat(r.value)]));
    const thresholds: AlertThresholds = {
      wind_speed_warning:  settings.wind_speed_warning  ?? 50,
      wind_speed_critical: settings.wind_speed_critical ?? 100,
      rainfall_warning:    settings.rainfall_warning    ?? 30,
      rainfall_critical:   settings.rainfall_critical   ?? 80,
    };

    // 3. Persist weather reading
    const { data: weatherLog } = await supabase
      .from('weather_logs')
      .insert({ temperature: weather.temperature, wind_speed: weather.wind_speed,
                rainfall: weather.rainfall, humidity: weather.humidity,
                condition: weather.condition, raw_json: weather.raw })
      .select().single();

    // 4. Load all barangays for matching
    const { data: barangays } = await supabase.from('barangays').select('*');

    // 5. Run the alert engine
    const evaluation = evaluateWeatherConditions(weather, barangays ?? [], thresholds);

    // 6. If alert level > 0 → create alert record
    if (evaluation.alertLevel > 0) {
      const { data: alertRecord } = await supabase
        .from('alerts')
        .insert({
          alert_level:        evaluation.alertLevel,
          message:            evaluation.message,
          triggered_by:       evaluation.triggered_by,
          affected_barangays: evaluation.affectedBarangays,
          weather_log_id:     weatherLog?.id ?? null,
        })
        .select().single();

      // 7. Dispatch SMS to barangay captains
      const recipients = evaluation.affectedBarangays
        .flatMap(b => b.contact_numbers.map(n => ({ number: n, barangayId: b.id })));

      if (recipients.length) {
        // Use Siren Formatting for Level 3 Emergency
        const finalMessage = evaluation.alertLevel === 3 
          ? formatSirenMessage(evaluation.message) 
          : evaluation.message;

        const smsResults = await sendBulkSms(
          recipients, 
          finalMessage
        );

        // 8. Log all SMS results
        const smsLogs = smsResults.map((r, i) => ({
          barangay_id:      recipients[i].barangayId,
          alert_id:         alertRecord?.id ?? null,
          recipient_number: r.number,
          message:          evaluation.message,
          status:           r.status,
          provider_response: r.response,
        }));
        await supabase.from('sms_logs').insert(smsLogs);
      }

      return NextResponse.json({ success: true, evaluation, weather, smsCount: recipients.length });
    }

    return NextResponse.json({ success: true, evaluation, weather, smsCount: 0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
