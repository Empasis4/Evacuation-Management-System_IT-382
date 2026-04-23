// ============================================================
// Application Layer – Alert Engine
// Core business logic for evaluating weather conditions
// and determining alert levels. Framework-agnostic.
// ============================================================

import { AlertLevel, AlertEvaluation, Barangay, WeatherData } from './types';

export interface AlertThresholds {
  wind_speed_warning:  number;
  wind_speed_critical: number;
  rainfall_warning:    number;
  rainfall_critical:   number;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  wind_speed_warning:  50,
  wind_speed_critical: 100,
  rainfall_warning:    30,
  rainfall_critical:   80,
};

/**
 * Evaluates raw weather data against configurable thresholds
 * and returns the computed alert level with a descriptive message.
 *
 * @param weather  - parsed weather payload from the API
 * @param barangays - list of all registered barangays
 * @param thresholds - configurable alert thresholds (from system_settings)
 */
export function evaluateWeatherConditions(
  weather: WeatherData,
  barangays: Barangay[],
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS
): AlertEvaluation {
  const { wind_speed, rainfall, condition } = weather;

  const conditionUpper = condition.toUpperCase();
  const isStorm = /STORM|TYPHOON|HURRICANE|THUNDERSTORM/.test(conditionUpper);
  const isHeavyRain = /HEAVY|EXTREME|INTENSE/.test(conditionUpper);

  let alertLevel: AlertLevel = 0;
  let triggered_by = 'routine_check';
  const triggers: string[] = [];

  // --- Rule 1: Emergency — storm detected or extreme wind ---
  if (isStorm || wind_speed >= thresholds.wind_speed_critical) {
    alertLevel = 3;
    if (isStorm) triggers.push(`storm detected (${condition})`);
    if (wind_speed >= thresholds.wind_speed_critical) triggers.push(`wind ${wind_speed}km/h ≥ ${thresholds.wind_speed_critical}km/h`);
  }

  // --- Rule 2: Critical — heavy rain or high wind ---
  if (alertLevel < 2 && (isHeavyRain || rainfall >= thresholds.rainfall_critical || wind_speed >= thresholds.wind_speed_critical)) {
    alertLevel = 2;
    if (isHeavyRain) triggers.push(`heavy rain detected (${condition})`);
    if (rainfall >= thresholds.rainfall_critical) triggers.push(`rainfall ${rainfall}mm/h ≥ ${thresholds.rainfall_critical}mm/h`);
  }

  // --- Rule 3: Warning — moderate rain or elevated wind ---
  if (alertLevel < 1 && (wind_speed >= thresholds.wind_speed_warning || rainfall >= thresholds.rainfall_warning)) {
    alertLevel = 1;
    if (wind_speed >= thresholds.wind_speed_warning) triggers.push(`wind ${wind_speed}km/h ≥ ${thresholds.wind_speed_warning}km/h`);
    if (rainfall >= thresholds.rainfall_warning) triggers.push(`rainfall ${rainfall}mm/h ≥ ${thresholds.rainfall_warning}mm/h`);
  }

  if (triggers.length) triggered_by = triggers.join('; ');

  // --- Determine affected barangays ---
  // For system-wide alerts (≥2), all barangays are affected.
  // For warnings (1), only high-risk barangays are included.
  const affectedBarangays =
    alertLevel >= 2
      ? barangays
      : alertLevel === 1
        ? barangays.filter(b => b.risk_level === 'high' || b.risk_level === 'critical')
        : [];

  const LEVEL_LABELS = ['SAFE', 'WARNING', 'CRITICAL', 'EMERGENCY'];
  const message = buildAlertMessage(alertLevel, weather, triggered_by);

  return { alertLevel, message, triggered_by, affectedBarangays };
}

/** Compose a human-readable SMS/broadcast message for the given alert */
function buildAlertMessage(level: AlertLevel, weather: WeatherData, trigger: string): string {
  const base = `[EVACSYS BUTUAN] Alert Level ${level} – ${['SAFE','WARNING','CRITICAL','EMERGENCY'][level]}. `;
  switch (level) {
    case 3:
      return base + `EMERGENCY EVACUATION REQUIRED. ${trigger}. Wind: ${weather.wind_speed}km/h, Rain: ${weather.rainfall}mm/h. Proceed to designated evacuation centers immediately.`;
    case 2:
      return base + `CRITICAL CONDITIONS. ${trigger}. Wind: ${weather.wind_speed}km/h, Rain: ${weather.rainfall}mm/h. Prepare for possible evacuation.`;
    case 1:
      return base + `WEATHER WARNING. ${trigger}. Wind: ${weather.wind_speed}km/h, Rain: ${weather.rainfall}mm/h. High-risk barangays on alert.`;
    default:
      return base + 'All systems normal.';
  }
}
