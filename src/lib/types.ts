// ============================================================
// Domain Layer – Core Type Definitions
// These types represent pure business concepts and are
// completely framework-agnostic.
// ============================================================

export type RiskLevel   = 'low' | 'medium' | 'high' | 'critical';
export type AlertLevel  = 0 | 1 | 2 | 3; // 0=safe 1=warning 2=critical 3=emergency
export type SmsStatus   = 'pending' | 'sent' | 'failed';
export type UserRole    = 'admin' | 'disaster_officer' | 'viewer';

export interface Barangay {
  id:                string;
  name:              string;
  captain_name:      string | null;
  contact_numbers:   string[];
  latitude:          number | null;
  longitude:         number | null;
  polygon_geojson:   Record<string, unknown> | null;
  risk_level:        RiskLevel;
  evacuation_center: string | null;
  created_at:        string;
  updated_at:        string;
}

export interface WeatherLog {
  id:          string;
  temperature: number | null;
  wind_speed:  number | null;
  rainfall:    number | null;
  humidity:    number | null;
  condition:   string | null;
  alert_level: AlertLevel;
  raw_json:    Record<string, unknown> | null;
  created_at:  string;
}

export interface Alert {
  id:                 string;
  alert_level:        AlertLevel;
  message:            string;
  triggered_by:       string | null;
  affected_barangays: Barangay[];
  weather_log_id:     string | null;
  created_at:         string;
}

export interface SmsLog {
  id:                string;
  barangay_id:       string | null;
  alert_id:          string | null;
  recipient_number:  string;
  message:           string;
  status:            SmsStatus;
  provider_response: Record<string, unknown> | null;
  created_at:        string;
}

export interface SystemSettings {
  key:        string;
  value:      string;
  description: string;
}

export interface WeatherData {
  temperature: number;
  wind_speed:  number;
  rainfall:    number;
  humidity:    number;
  condition:   string;
  raw:         Record<string, unknown>;
}

export interface AlertEvaluation {
  alertLevel:         AlertLevel;
  message:            string;
  triggered_by:       string;
  affectedBarangays:  Barangay[];
}

/** Alert level color utilities */
export const ALERT_COLORS: Record<AlertLevel, { bg: string; border: string; text: string; label: string }> = {
  0: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-400', label: 'SAFE' },
  1: { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/40',  text: 'text-yellow-400',  label: 'WARNING' },
  2: { bg: 'bg-orange-500/10',  border: 'border-orange-500/40',  text: 'text-orange-400',  label: 'CRITICAL' },
  3: { bg: 'bg-red-500/10',     border: 'border-red-500/40',     text: 'text-red-400',     label: 'EMERGENCY' },
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  low:      '#22c55e',
  medium:   '#eab308',
  high:     '#f97316',
  critical: '#ef4444',
};
