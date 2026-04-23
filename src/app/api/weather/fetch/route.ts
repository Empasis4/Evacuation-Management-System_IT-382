// ============================================================
// API Route: GET /api/weather/fetch
// Fetches current weather for Butuan City, evaluates alert
// conditions, and persists the reading to weather_logs.
// ============================================================

import { NextResponse } from 'next/server';
import { fetchButuanWeather } from '@/lib/weather-service';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const weather = await fetchButuanWeather();
    const supabase = createServiceClient();

    // Persist weather reading to Supabase
    const { data, error } = await supabase
      .from('weather_logs')
      .insert({
        temperature: weather.temperature,
        wind_speed:  weather.wind_speed,
        rainfall:    weather.rainfall,
        humidity:    weather.humidity,
        condition:   weather.condition,
        raw_json:    weather.raw,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, weather, log: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
