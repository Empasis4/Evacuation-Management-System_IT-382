-- =============================================
-- EVACSYS: Butuan City Early Warning System
-- Run this in Supabase SQL Editor
-- =============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- barangays table
CREATE TABLE IF NOT EXISTS public.barangays (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  captain_name    TEXT,
  contact_numbers TEXT[] DEFAULT '{}',
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  polygon_geojson JSONB,
  risk_level      TEXT DEFAULT 'low' CHECK (risk_level IN ('low','medium','high','critical')),
  evacuation_center TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- weather_logs table
CREATE TABLE IF NOT EXISTS public.weather_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  temperature  DOUBLE PRECISION,
  wind_speed   DOUBLE PRECISION,
  rainfall     DOUBLE PRECISION,
  humidity     INTEGER,
  condition    TEXT,
  alert_level  INTEGER DEFAULT 0,
  raw_json     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_level         INTEGER DEFAULT 0 CHECK (alert_level BETWEEN 0 AND 3),
  message             TEXT NOT NULL,
  triggered_by        TEXT,
  affected_barangays  JSONB DEFAULT '[]',
  weather_log_id      UUID REFERENCES public.weather_logs(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- sms_logs table
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barangay_id       UUID REFERENCES public.barangays(id) ON DELETE SET NULL,
  alert_id          UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
  recipient_number  TEXT NOT NULL,
  message           TEXT NOT NULL,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  provider_response JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  role       TEXT DEFAULT 'viewer' CHECK (role IN ('admin','disaster_officer','viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Default settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('wind_speed_warning',  '50',   'Wind speed km/h for WARNING'),
  ('wind_speed_critical', '100',  'Wind speed km/h for CRITICAL'),
  ('rainfall_warning',    '30',   'Rainfall mm/h for WARNING'),
  ('rainfall_critical',   '80',   'Rainfall mm/h for CRITICAL'),
  ('check_interval_min',  '10',   'Weather poll interval in minutes')
ON CONFLICT (key) DO NOTHING;

-- Seed barangays
INSERT INTO public.barangays (name, captain_name, contact_numbers, latitude, longitude, risk_level, evacuation_center) VALUES
  ('Libertad',   'Juan Santos',   ARRAY['09171234567'], 8.9412, 125.5234, 'high',     'Libertad Central School'),
  ('Doongan',    'Maria Cruz',    ARRAY['09281234567'], 8.9567, 125.5345, 'medium',   'Doongan Covered Gym'),
  ('Bading',     'Pedro Reyes',   ARRAY['09091234567'], 8.9489, 125.5312, 'high',     'Bading Elementary School'),
  ('Obrero',     'Ana Lopez',     ARRAY['09171112233'], 8.9380, 125.5290, 'low',      'Obrero Covered Court'),
  ('Imadejas',   'Carlos Tan',    ARRAY['09281112233'], 8.9620, 125.5190, 'critical', 'Imadejas Multi-purpose Hall'),
  ('Ambago',     'Lita Flores',   ARRAY['09091112233'], 8.9700, 125.5400, 'medium',   'Ambago Elementary School'),
  ('Taguibo',    'Ramon Uy',      ARRAY['09171223344'], 8.9800, 125.5600, 'high',     'Taguibo Covered Gym'),
  ('Antongalon', 'Gloria Reyes',  ARRAY['09281223344'], 8.9300, 125.5100, 'medium',   'Antongalon Multi-purpose Hall')
ON CONFLICT DO NOTHING;

-- RLS policies
ALTER TABLE public.barangays        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_barangays"  ON public.barangays       FOR SELECT USING (true);
CREATE POLICY "read_alerts"     ON public.alerts          FOR SELECT USING (true);
CREATE POLICY "read_weather"    ON public.weather_logs    FOR SELECT USING (true);
CREATE POLICY "read_sms"        ON public.sms_logs        FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_settings"   ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_profiles"   ON public.profiles        FOR SELECT TO authenticated USING (true);

CREATE POLICY "write_barangays" ON public.barangays       FOR ALL TO service_role USING (true);
CREATE POLICY "write_alerts"    ON public.alerts          FOR ALL TO service_role USING (true);
CREATE POLICY "write_weather"   ON public.weather_logs    FOR ALL TO service_role USING (true);
CREATE POLICY "write_sms"       ON public.sms_logs        FOR ALL TO service_role USING (true);
CREATE POLICY "write_settings"  ON public.system_settings FOR ALL TO service_role USING (true);
CREATE POLICY "write_profiles"  ON public.profiles        FOR ALL TO service_role USING (true);
