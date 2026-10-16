"use client";

import React, { useEffect, useState } from "react";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Props {
  appName: string;
  tagline: string;
  storageKey: string;
}

const SNOOZE_DAYS = 3;

export default function InstallAppPrompt({ appName, tagline, storageKey }: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"hidden" | "android" | "ios">("hidden");
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Registrar el service worker (requisito para el cartel nativo de Android)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Si ya está abierta como app instalada, no mostrar nada
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    // Respetar "Ahora no" durante unos días
    const snoozed = Number(localStorage.getItem(`install_snooze_${storageKey}`) || 0);
    if (Date.now() < snoozed) return;

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

    // iPhone: Apple no permite instalar con un botón; se muestra la guía visual
    if (isIOS) {
      const t = setTimeout(() => setMode("ios"), 1500);
      return () => clearTimeout(t);
    }

    // Android / Chrome: capturar el evento y mostrar NUESTRO cartel
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (isMobile) setMode("android");
    };
    const onInstalled = () => {
      setMode("hidden");
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [storageKey]);

  const snooze = () => {
    localStorage.setItem(
      `install_snooze_${storageKey}`,
      String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000)
    );
    setMode("hidden");
  };

  const install = async () => {
    if (!deferred) return;
    setInstalling(true);
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setInstalling(false);
    setDeferred(null);
    if (outcome === "accepted") setMode("hidden");
    else snooze();
  };

  if (mode === "hidden") return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm p-3 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-orange-500/40 rounded-3xl shadow-2xl shadow-orange-500/10 p-5 mb-2 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-start gap-4">
          <img
            src="/icons/icon-192x192.png"
            alt={appName}
            className="w-16 h-16 rounded-2xl shadow-lg shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-white leading-tight">
              ¿Instalar {appName} en tu celular?
            </h2>
            <p className="text-xs text-orange-300 font-semibold mt-0.5">{tagline}</p>
          </div>
          <button
            type="button"
            onClick={snooze}
            aria-label="Cerrar"
            className="p-1.5 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul className="mt-4 space-y-1.5 text-[13px] text-slate-300">
          <li className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-orange-400" /> Icono propio en la pantalla de inicio</li>
          <li className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-orange-400" /> Se abre a pantalla completa, sin barra del navegador</li>
          <li className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-orange-400" /> Sin Play Store ni App Store, ocupa muy poco espacio</li>
        </ul>

        {mode === "android" ? (
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={snooze}
              className="py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-bold text-sm"
            >
              Ahora no
            </button>
            <button
              type="button"
              onClick={install}
              disabled={installing}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {installing ? "Instalando..." : "Instalar"}
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-2.5">
            <p className="text-[12px] text-slate-400">En iPhone se instala en 2 toques:</p>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="w-7 h-7 rounded-full bg-orange-500 text-white font-black text-sm flex items-center justify-center shrink-0">1</span>
              <span className="text-sm text-slate-200 flex items-center gap-1.5 flex-wrap">
                Toca <Share className="w-5 h-5 text-sky-400 inline" /> <strong>Compartir</strong> abajo en la pantalla
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="w-7 h-7 rounded-full bg-orange-500 text-white font-black text-sm flex items-center justify-center shrink-0">2</span>
              <span className="text-sm text-slate-200 flex items-center gap-1.5 flex-wrap">
                Elige <PlusSquare className="w-5 h-5 text-sky-400 inline" /> <strong>Agregar a inicio</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={snooze}
              className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-bold text-sm"
            >
              Entendido
            </button>
            <div className="flex justify-center pt-1 animate-bounce text-sky-400 text-xl">↓</div>
          </div>
        )}
      </div>
    </div>
  );
}
