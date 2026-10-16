-- ==============================================================================
-- PRENSA NEXORAONE • ESQUEMA DE BASE DE DATOS MAESTRO (ENTERPRISE)
-- Firma Desarrolladora: Nexora One © Todos los derechos reservados
-- ==============================================================================

-- 1. TABLA DE ARTICULOS Y NOTICIAS
CREATE TABLE IF NOT EXISTS public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  excerpt text,
  content text,
  image_url text,
  video_url text,
  external_url text,
  category text DEFAULT 'general',
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
  author_id text,
  social_published boolean DEFAULT false,
  wp_post_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. TABLA DE FLASHES NOTICIOSOS (1 a 5 MINUTOS)
CREATE TABLE IF NOT EXISTS public.news_flashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  duration_seconds integer NOT NULL DEFAULT 180,
  video_url text NOT NULL,
  thumbnail_url text,
  embed_url text,
  segments jsonb DEFAULT '[]'::jsonb,
  category text NOT NULL DEFAULT 'nacional',
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
  partner_visible boolean NOT NULL DEFAULT true,
  views_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. BUFFER DE COLA DE CORRESPONSALIA Y VECINOS (STAGING)
CREATE TABLE IF NOT EXISTS public.editorial_staging_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id text NOT NULL DEFAULT 'external_partner',
  raw_metadata_title text,
  geolocation_coordinates text NOT NULL DEFAULT '-27.5973, -56.6874',
  attached_media_url text[] DEFAULT '{}'::text[],
  audio_url text,
  video_url text,
  status text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW', 'APPROVED_PORTAL_ONLY', 'APPROVED_PARTNER_ONLY', 'APPROVED_ALL_SIMULTANEOUS', 'AUDIO_ERROR_MANUAL_REVIEW_REQUIRED', 'ARCHIVED')),
  version_nexativa jsonb,
  version_partner jsonb,
  transcription text,
  is_anonymous boolean DEFAULT false,
  corresponsal_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. ALERTAS EDITORIALES Y MONITOREO DE FALLOS DE DISPATCH
CREATE TABLE IF NOT EXISTS public.editorial_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_item_id uuid REFERENCES public.editorial_staging_queue(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  message text NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. BANDEJA DE ENLACE DIRECTO DE VIDEOS DE SOCIOS Y ESTUDIOS
CREATE TABLE IF NOT EXISTS public.partner_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name text NOT NULL DEFAULT 'Cadena 4',
  title text NOT NULL,
  video_url text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'archived')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 6. CANALES DE DISTRIBUCION OMNICANAL (WORDPRESS, META, TELEGRAM, WEBHOOKS)
CREATE TABLE IF NOT EXISTS public.distribution_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('wordpress', 'meta_instagram', 'meta_facebook', 'telegram', 'twitter', 'webhook')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 7. AUDITORIA DE DESPACHOS Y REGISTRO DE SINCRONIZACION
CREATE TABLE IF NOT EXISTS public.distribution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id text,
  channel_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'retrying')),
  payload jsonb,
  response text,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- 8. CONFIGURACIONES GENERALES Y BRANDING
CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamp with time zone DEFAULT now()
);

-- 9. AUTENTICACION DE PERSONAL Y ROLES EDITORIALES
CREATE TABLE IF NOT EXISTS public.staff_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'director', 'editor', 'corresponsal')),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- VALORES POR DEFECTO PARA ARRANQUE
INSERT INTO public.staff_passwords (password, role, name)
VALUES 
  ('PrensaMaster2026!', 'admin', 'Director de Prensa'),
  ('Cadena4Redactor', 'editor', 'Jefe de Redacción Cadena 4'),
  ('MovilCalle123', 'corresponsal', 'Corresponsal de Exteriores')
ON CONFLICT (password) DO NOTHING;

INSERT INTO public.settings (key, value)
VALUES
  ('brand_name', 'Prensa NexoraOne • Cadena 4'),
  ('client_name', 'Cadena 4'),
  ('client_station', 'FM 94.5 • Noticieros y Señal Digital'),
  ('main_cover_article_id', ''),
  ('partner_webhook_url', '')
ON CONFLICT (key) DO NOTHING;

-- HABILITACION DE RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_flashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_staging_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_passwords ENABLE ROW LEVEL SECURITY;

-- POLITICAS DE ACCESO UNIVERSAL ABIERTAS PARA EL SERVICIO
DROP POLICY IF EXISTS "allow_all_articles" ON public.articles;
CREATE POLICY "allow_all_articles" ON public.articles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_flashes" ON public.news_flashes;
CREATE POLICY "allow_all_flashes" ON public.news_flashes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_staging" ON public.editorial_staging_queue;
CREATE POLICY "allow_all_staging" ON public.editorial_staging_queue FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_alerts" ON public.editorial_alerts;
CREATE POLICY "allow_all_alerts" ON public.editorial_alerts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_partner_videos" ON public.partner_videos;
CREATE POLICY "allow_all_partner_videos" ON public.partner_videos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_channels" ON public.distribution_channels;
CREATE POLICY "allow_all_channels" ON public.distribution_channels FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_logs" ON public.distribution_logs;
CREATE POLICY "allow_all_logs" ON public.distribution_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_settings" ON public.settings;
CREATE POLICY "allow_all_settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_staff" ON public.staff_passwords;
CREATE POLICY "allow_all_staff" ON public.staff_passwords FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
