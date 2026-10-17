"use client";

import React, { useEffect, useState, useRef } from "react";
import { Bell, BellRing, BellOff, Volume2, ShieldAlert, X, ExternalLink, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Generador de audio de alerta estilo transmision periodistica con Web Audio API
function playBreakingChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // Acorde triple de breaking news (A5 -> C6 -> E6)
    playTone(880, 0, 0.15);
    playTone(1046.5, 0.14, 0.18);
    playTone(1318.5, 0.30, 0.45);
  } catch (e) {
    console.warn("[WebAudio Alert]", e);
  }
}

interface AlertBanner {
  id: string;
  title: string;
  body: string;
  url: string;
  source: string;
}

export default function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [activeBanner, setActiveBanner] = useState<AlertBanner | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Suscribirse al canal Supabase Realtime para captar despachos de la calle con 0 latencia
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("editorial-live-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "editorial_staging_queue" },
        (payload: any) => {
          const item = payload.new;
          const reporter = item.corresponsal_name || "Móvil de Exteriores";
          const headline = item.raw_metadata_title || item.transcription?.slice(0, 90) || "Nuevo despacho en vivo";

          playBreakingChime();
          setActiveBanner({
            id: String(item.id || Date.now()),
            title: "🎙️ " + reporter + " envió un nuevo despacho",
            body: headline,
            url: "/admin/corresponsal",
            source: "Corresponsal Móvil"
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "news_flashes" },
        (payload: any) => {
          const item = payload.new;
          playBreakingChime();
          setActiveBanner({
            id: String(item.id || Date.now()),
            title: "⚡ FLASH URGENTE DE ÚLTIMA HORA",
            body: item.title || "Nuevo flash emitido en estudio",
            url: "/admin/flashes",
            source: "Flash Editorial"
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const subscribeUserToPush = async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Tu navegador actual no admite notificaciones Push en segundo plano.");
      return;
    }

    try {
      setIsSubscribing(true);
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setIsSubscribing(false);
        return;
      }

      // Obtener la clave publica VAPID
      const res = await fetch("/api/push/subscribe");
      const { vapidPublicKey } = await res.json();

      if (!vapidPublicKey) {
        throw new Error("No se pudo obtener la clave VAPID");
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      // Enviar suscripción al backend
      const storedRole = localStorage.getItem("nora_prensa_role") || "Editor";
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription, role: storedRole })
      });

      // Confirmar con chime sonoro
      playBreakingChime();
    } catch (err: any) {
      console.error("[Push Subscribe Error]:", err);
      alert("Error al activar notificaciones Push: " + (err?.message || err));
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setIsTesting(true);
      playBreakingChime();

      setActiveBanner({
        id: "test-" + Date.now(),
        title: "🚨 PRUEBA: Corresponsal de Exteriores • Alerta Activa",
        body: "Poste caído provoca corte generalizado en el centro de Ituzaingó.",
        url: "/admin/corresponsal",
        source: "Simulador de Alerta"
      });

      // Enviar push a la API
      await fetch("/api/push/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🚨 Prensa NexoraOne: Alerta de Exteriores",
          body: "Prueba de notificación Push verificada con éxito en tu dispositivo.",
          url: "/admin/corresponsal"
        })
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      {/* Banner flotante de última hora (si entra despacho en caliente) */}
      {activeBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xl animate-in slide-in-from-top-4 duration-300">
          <div className="bg-gradient-to-r from-red-950 via-slate-900 to-amber-950 border-2 border-red-500/80 rounded-2xl p-4 shadow-2xl shadow-red-500/30 flex items-start gap-3.5 backdrop-blur-xl">
            <div className="p-2.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 shrink-0 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
                  {activeBanner.source}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Ahora</span>
              </div>
              
              <h4 className="text-sm font-bold text-white truncate">
                {activeBanner.title}
              </h4>
              <p className="text-xs text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                {activeBanner.body}
              </p>

              <div className="flex items-center gap-2 mt-2.5">
                <a
                  href={activeBanner.url}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
                >
                  <span>Revisar y Publicar</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setActiveBanner(null)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <button
              onClick={() => setActiveBanner(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Botonera de Control de Push en el Header */}
      <div className="flex items-center gap-1.5">
        {permission !== "granted" ? (
          <button
            type="button"
            onClick={subscribeUserToPush}
            disabled={isSubscribing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-semibold transition-all shadow-sm active:scale-95"
            title="Activar alertas sonoras y push al móvil cuando un periodista envíe noticias urgentes"
          >
            <BellRing className="w-3.5 h-3.5 animate-bounce" />
            <span className="hidden sm:inline">Activar Alertas PWA</span>
            <span className="sm:hidden">Alertas</span>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold"
              title="Notificaciones Push en tiempo real activadas en tu dispositivo"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Bell className="w-3 h-3 text-emerald-400" />
              <span className="hidden md:inline">Alertas en Vivo</span>
            </div>

            <button
              type="button"
              onClick={handleTestNotification}
              disabled={isTesting}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs transition-colors"
              title="Probar sonido de sirena y alerta editorial"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
