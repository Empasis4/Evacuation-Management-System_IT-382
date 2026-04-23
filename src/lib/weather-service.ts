// ============================================================
// Infrastructure Layer – Weather Service
// Fetches and normalises data from OpenWeatherMap API.
// ============================================================

import { WeatherData } from './types';

const OWM_BASE = 'https://api.openweathermap.org/data/2.5';
// Butuan City coordinates
const BUTUAN_LAT = 8.9475;
const BUTUAN_LON = 125.5406;

/**
 * Fetches current weather for Butuan City from OpenWeatherMap.
 * Normalises the API response into our domain WeatherData shape.
 */
export async function fetchButuanWeather(
  apiKey: string = process.env.OPENWEATHER_API_KEY!
): Promise<WeatherData> {
  const url = `${OWM_BASE}/weather?lat=${BUTUAN_LAT}&lon=${BUTUAN_LON}&appid=${apiKey}&units=metric`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`OpenWeatherMap error: ${res.status} ${res.statusText}`);

  const raw = await res.json();

  // Extract rain volume (last 1h or default 0)
  const rainfall = raw.rain?.['1h'] ?? raw.rain?.['3h'] ?? 0;

  return {
    temperature: raw.main?.temp      ?? 0,
    wind_speed:  (raw.wind?.speed ?? 0) * 3.6, // m/s → km/h
    rainfall,
    humidity:    raw.main?.humidity  ?? 0,
    condition:   raw.weather?.[0]?.description ?? 'unknown',
    raw,
  };
}
