"use client";

import React, { useEffect, useState } from "react";
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";

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
  const [mode, setMode] = useState<"hidden" | "android" | "ios" | "inapp" | "success">("hidden");
  const [installing, setInstalling] = useState(false);
  const [fallbackGuidance, setFallbackGuidance] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Registrar service worker para habilitar PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // 2. Si ya está abierta como app instalada (Standalone), no mostrar nada
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // 3. Respetar "Ahora no"
    const snoozed = Number(localStorage.getItem(`install_snooze_${storageKey}`) || 0);
    if (Date.now() < snoozed) return;

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    const isInApp = /WhatsApp|FBAN|FBAV|Instagram|Telegram|Line/i.test(ua);

    // Si está dentro de WhatsApp o WebView, advertir que abra en Chrome
    if (isInApp && isMobile) {
      const t = setTimeout(() => setMode("inapp"), 1000);
      return () => clearTimeout(t);
    }

    // iPhone: guía visual directa
    if (isIOS) {
      const t = setTimeout(() => setMode("ios"), 1500);
      return () => clearTimeout(t);
    }

    // Android / Chrome: capturar evento de instalación
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (isMobile) setMode("android");
    };

    const onInstalled = () => {
      setMode("success");
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Fallback: si pasaron 3 segundos en Android y no disparó onPrompt (o ya fue disparado antes)
    const fallbackTimer = setTimeout(() => {
      if (isMobile && !isIOS && !isInApp && mode === "hidden") {
        setMode("android");
      }
    }, 2500);

    return () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [storageKey, mode]);

  const snooze = () => {
    localStorage.setItem(
      `install_snooze_${storageKey}`,
      String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000)
    );
    setMode("hidden");
  };

  const install = async () => {
    if (deferred) {
      setInstalling(true);
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        setInstalling(false);
        setDeferred(null);
        if (outcome === "accepted") {
          setMode("success");
        } else {
          snooze();
        }
      } catch (e) {
        setInstalling(false);
        setFallbackGuidance(true);
      }
    } else {
      // Si el navegador no dio el objeto diferido, mostrar la guía de 2 pasos de Chrome
      setFallbackGuidance(true);
    }
  };

  if (mode === "hidden") return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-orange-500/40 rounded-3xl shadow-2xl shadow-orange-500/20 p-5 mb-2 sm:mb-0 animate-in slide-in-from-bottom duration-300">
        
        {/* PANTALLA 1: ÉXITO - LA APP YA ESTÁ INSTALADA */}
        {mode === "success" ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-white">¡App Agregada con Éxito!</h2>
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                {appName} ya está instalada en tu teléfono
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left text-xs text-slate-300 space-y-2.5">
              <p className="text-white font-bold flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-orange-400" />
                ¿Dónde encontrarla ahora en tu celular?
              </p>
              <div className="space-y-1.5 text-[11px] text-slate-300">
                <p>• <strong>Pantalla de inicio:</strong> Revisa tus escritorios (suele crearse en la última página a la derecha).</p>
                <p>• <strong>Cajón de aplicaciones:</strong> Desliza tu dedo hacia arriba en la pantalla principal para ver todas tus apps y busca <strong>&quot;{appName}&quot;</strong>.</p>
                <p className="text-orange-300 text-[10px] pt-1">
                  💡 <em>Nota: No se descarga en la carpeta &quot;Descargas&quot;; se instala directamente como icono nativo en el sistema.</em>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMode("hidden")}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/30"
            >
              ¡Entendido, abrir desde el celular!
            </button>
          </div>
        ) : mode === "inapp" ? (
          /* PANTALLA 2: USUARIO NAVEGANDO DENTRO DE WHATSAPP O SIMILAR */
          <div className="space-y-4 py-1">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Estás dentro de WhatsApp</h3>
                <p className="text-xs text-amber-300">Para instalarla en tu celular se requiere Google Chrome o tu navegador predeterminado.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-2 font-mono">
              <p className="font-bold text-white">Pasos rápidos para instalar:</p>
              <p>1. Toca los <strong>3 puntos (⋮)</strong> arriba a la derecha de esta pantalla.</p>
              <p>2. Selecciona <strong>&quot;Abrir en Chrome&quot;</strong> o &quot;Abrir en navegador&quot;.</p>
              <p>3. Allí te saldrá el botón directo de instalar.</p>
            </div>

            <button
              type="button"
              onClick={snooze}
              className="w-full py-3 rounded-2xl bg-white/10 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/20"
            >
              Cerrar aviso
            </button>
          </div>
        ) : (
          /* PANTALLA 3: MODAL ESTÁNDAR DE INSTALACIÓN */
          <div>
            <div className="flex items-start gap-4">
              <img
                src="/icons/icon-192x192.png"
                alt={appName}
                className="w-16 h-16 rounded-2xl shadow-lg shrink-0 border border-white/10"
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

            <ul className="mt-4 space-y-1.5 text-[12px] text-slate-300">
              <li className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-orange-400 shrink-0" /> Icono propio en la pantalla de inicio con logo N1</li>
              <li className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-orange-400 shrink-0" /> Abre a pantalla completa nativa sin barras del navegador</li>
              <li className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-orange-400 shrink-0" /> Instalación instantánea (no consume memoria de Play Store)</li>
            </ul>

            {mode === "android" ? (
              fallbackGuidance ? (
                <div className="mt-4 p-3.5 rounded-2xl bg-black/60 border border-orange-500/30 text-xs text-slate-300 space-y-2">
                  <p className="font-bold text-orange-400">Para agregar el icono a tu pantalla:</p>
                  <p>1. Toca los <strong>3 puntos (⋮)</strong> de Chrome arriba a la derecha.</p>
                  <p>2. Selecciona <strong>&quot;Instalar aplicación&quot;</strong> o <strong>&quot;Agregar a la pantalla principal&quot;</strong>.</p>
                  <button
                    type="button"
                    onClick={() => setMode("hidden")}
                    className="w-full mt-2 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-xs uppercase"
                  >
                    Entendido
                  </button>
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={snooze}
                    className="py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-bold text-sm hover:bg-white/10"
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
              )
            ) : (
              /* Guía iPhone */
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
        )}
      </div>
    </div>
  );
}
