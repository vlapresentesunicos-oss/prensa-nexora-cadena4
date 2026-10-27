-- ==============================================================================
-- PRENSA NEXORAONE • ESQUEMA MAESTRO DE BASE DE DATOS (SUPABASE / POSTGRESQL)
-- Nexora One © Todos los derechos reservados. Cliente Oficial: Cadena 4
-- ==============================================================================

-- 1. TABLA: Artículos Publicados y Borradores
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'draft',
    wp_post_id TEXT,
    social_published BOOLEAN DEFAULT FALSE,
    external_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: Cola de Staging Editorial (Corresponsalía de Exteriores y Movilero)
CREATE TABLE IF NOT EXISTS public.editorial_staging_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id TEXT NOT NULL DEFAULT 'movil_calle',
    corresponsal_name TEXT DEFAULT 'Corresponsal de Exteriores',
    is_anonymous BOOLEAN DEFAULT FALSE,
    raw_metadata_title TEXT,
    geolocation_coordinates TEXT DEFAULT '-27.5973, -56.6874',
    attached_media_url JSONB DEFAULT '[]'::jsonb,
    audio_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    transcription TEXT,
    version_nexativa JSONB,
    version_partner JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: Flashes de Noticias de Último Momento & Auto-Clipper
CREATE TABLE IF NOT EXISTS public.news_flashes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    summary TEXT,
    duration_seconds INTEGER DEFAULT 180,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    embed_url TEXT,
    segments JSONB DEFAULT '[]'::jsonb,
    partner_visible BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'published',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: Alertas Editoriales y Fallos de Webhook
CREATE TABLE IF NOT EXISTS public.editorial_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_item_id UUID,
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: Registro de Auditoría de Distribución Omnicanal
CREATE TABLE IF NOT EXISTS public.distribution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID,
    channel_type TEXT NOT NULL,
    status TEXT NOT NULL,
    payload JSONB,
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: Suscripciones de Notificaciones Web Push (VAPID)
CREATE TABLE IF NOT EXISTS public.prensa_push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    keys JSONB NOT NULL,
    user_role TEXT DEFAULT 'Editor',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: Configuraciones Globales y Socios Webhook
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES DE ALTO RENDIMIENTO PARA CONSULTAS BAJO ESTRÉS
CREATE INDEX IF NOT EXISTS idx_articles_status_created ON public.articles (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staging_status_updated ON public.editorial_staging_queue (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_flashes_created ON public.news_flashes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_subs_role ON public.prensa_push_subscriptions (user_role);

-- Habilitar extensión pgcrypto para generación de UUIDs si no existe
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
