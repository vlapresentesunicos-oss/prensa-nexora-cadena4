"use client";

import React, { useState, useEffect } from "react";
import { 
  Share2, 
  Globe, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  RefreshCw,
  Sparkles,
  Link as LinkIcon
} from "lucide-react";

export default function OmnichannelDistributionPage() {
  const [testingWp, setTestingWp] = useState(false);
  const [testingTg, setTestingTg] = useState(false);
  const [testingWh, setTestingWh] = useState(false);

  const [wpStatus, setWpStatus] = useState<string | null>(null);
  const [tgStatus, setTgStatus] = useState<string | null>(null);
  const [whStatus, setWhStatus] = useState<string | null>(null);

  const [wpConfig, setWpConfig] = useState({
    siteUrl: "https://cadena4.com.ar",
    username: "redaccion",
    appPassword: "",
  });

  const [webhookUrl, setWebhookUrl] = useState("");

  const handleTestWordPress = async () => {
    setTestingWp(true);
    setWpStatus("Verificando credenciales con WordPress REST API...");
    try {
      const res = await fetch("/api/dispatch/wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🔴 Publicación de Prueba • Prensa NexoraOne",
          content: "<p>Esta es una publicación de prueba del canal omnicanal para verificar la conexión directa.</p>",
          excerpt: "Verificación de enlace API",
          status: "draft",
          customConfig: wpConfig.appPassword ? wpConfig : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWpStatus(`✅ ¡Conexión Exitosa! Borrador creado en WP ID #${data.postId}`);
      } else {
        setWpStatus(`❌ Error de WordPress: ${data.error}`);
      }
    } catch (err: any) {
      setWpStatus(`❌ Error de conexión: ${err?.message || err}`);
    } finally {
      setTestingWp(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWh(true);
    setWhStatus("Enviando evento de prueba a Webhook...");
    try {
      const res = await fetch("/api/dispatch/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl || undefined,
          payload: {
            event: "ping",
            timestamp: new Date().toISOString(),
            data: { message: "Ping de verificación desde Prensa NexoraOne • Cadena 4" },
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWhStatus(`✅ ¡Webhook recibido con éxito! (Intentos: ${data.attempts})`);
      } else {
        setWhStatus(`❌ Falló Webhook: ${data.error}`);
      }
    } catch (err: any) {
      setWhStatus(`❌ Error: ${err?.message || err}`);
    } finally {
      setTestingWh(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-2xl md:text-3xl font-serif font-black text-white tracking-widest uppercase flex items-center gap-3">
          <Share2 className="w-7 h-7 text-red-500" />
          Hub de Distribución <span className="text-red-500">Omnicanal</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Control de Despacho Instantáneo hacia WordPress Oficial (Cadena 4), Redes Sociales y Webhooks
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: WordPress Portal Oficial */}
        <div className="glass-card p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Portal Web Oficial (WordPress Cadena 4)
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              REST API v2
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Publicación directa y subida de imágenes destacadas a la biblioteca de medios mediante <strong>Application Passwords</strong> (sin plugins adicionales).
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase">URL del Portal de Cadena 4</label>
              <input
                type="text"
                value={wpConfig.siteUrl}
                onChange={(e) => setWpConfig({ ...wpConfig, siteUrl: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase">Usuario de Redacción</label>
                <input
                  type="text"
                  value={wpConfig.username}
                  onChange={(e) => setWpConfig({ ...wpConfig, username: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase">Contraseña de Aplicación</label>
                <input
                  type="password"
                  value={wpConfig.appPassword}
                  onChange={(e) => setWpConfig({ ...wpConfig, appPassword: e.target.value })}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {wpStatus && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-slate-200">
                {wpStatus}
              </div>
            )}

            <button
              onClick={handleTestWordPress}
              disabled={testingWp}
              className="w-full py-2.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {testingWp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              <span>{testingWp ? "Comprobando..." : "Probar Conexión con WordPress"}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Webhooks Automatizadores (Make.com / n8n) */}
        <div className="glass-card p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Webhooks (Make.com, n8n, Zapier)
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Opcional
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Dispara eventos JSON con retroceso exponencial a flujos de trabajo externos cuando se publica una noticia o flash.
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase">URL del Webhook Saliente</label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hook.us1.make.com/..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            {whStatus && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-slate-200">
                {whStatus}
              </div>
            )}

            <button
              onClick={handleTestWebhook}
              disabled={testingWh}
              className="w-full py-2.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {testingWh ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{testingWh ? "Enviando..." : "Enviar Webhook de Prueba"}</span>
            </button>
          </div>
        </div>

        {/* Card 3: Canales de Difusión (Telegram & Meta) */}
        <div className="glass-card p-6 border border-white/10 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Redes Sociales & Mensajería Masiva
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Meta Graph & Bot API
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5 space-y-2">
              <span className="font-bold text-white block">📸 Instagram Feed</span>
              <p className="text-slate-400 text-[11px]">
                Publica automáticamente la imagen y el copy redactado por Nora con hashtags neutrales.
              </p>
              <span className="text-[10px] text-emerald-400 font-mono block">Direct Graph API v19</span>
            </div>

            <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5 space-y-2">
              <span className="font-bold text-white block">👥 Facebook Page</span>
              <p className="text-slate-400 text-[11px]">
                Inserta publicaciones completas en la Fanpage oficial de Cadena 4 con enlace directo a la nota.
              </p>
              <span className="text-[10px] text-emerald-400 font-mono block">Auto-Link Feed</span>
            </div>

            <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5 space-y-2">
              <span className="font-bold text-white block">💬 Canal de Telegram</span>
              <p className="text-slate-400 text-[11px]">
                Emite alertas instantáneas a la comunidad con botón de lectura completa.
              </p>
              <span className="text-[10px] text-emerald-400 font-mono block">HTML Broadcast Bot</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
