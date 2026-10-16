"use client";

import { useState, useEffect } from "react";
import { QrCode, Download, Printer, Share2, Copy, Check, Radio, Sparkles, ShieldAlert, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";

export default function AdminCitizenQrPage() {
  const [targetUrl, setTargetUrl] = useState("https://prensa-nexora-cadena4.vercel.app/corresponsal-movil");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/corresponsal-movil`;
      setTargetUrl(url);

      QRCode.toDataURL(
        url,
        {
          width: 500,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        },
        (err, dataUri) => {
          if (!err && dataUri) {
            setQrDataUrl(dataUri);
          }
        }
      );
    }
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🎙️ *CADENA 4 • TERMINAL DE EXTERIORES NORA MÓVIL*\n\nAcceso directo para móviles, cronistas y corresponsales:\n${targetUrl}\n\nPIN de Ingreso: *MovilCalle123*\n\n(Abre el enlace para enviar audios, fotos y testimonios de la calle directo a la mesa de noticias)`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-950 via-black to-slate-900 border border-red-500/30 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Link href="/admin/corresponsal" className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 hover:underline mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a Cola de Corresponsalía
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <QrCode className="w-8 h-8 text-red-500" /> Código QR: Nora Periodista de Exteriores
          </h1>
          <p className="text-gray-400 text-sm max-w-2xl">
            Imprime o comparte este Código QR en afiches, redes o envía a los periodistas de calle. Permite enviar audios con transcripción, fotos y testimonios directos a la redacción central.
          </p>
        </div>

        <div className="text-[10px] text-gray-400 bg-black/60 border border-white/10 px-3 py-2 rounded-xl text-right font-mono">
          Desarrollado por <strong className="text-white">Nexora One</strong>
          <span className="block text-red-400 font-bold font-sans uppercase">Prensa NexoraOne • Cadena 4 ©</span>
        </div>
      </div>

      {/* Main Printable Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Poster Card */}
        <div className="bg-white text-slate-900 p-8 rounded-3xl border-4 border-red-600 shadow-2xl space-y-6 text-center print:border-none print:shadow-none print:p-0">
          <div className="bg-red-600 text-white py-2 px-4 rounded-xl font-black text-sm uppercase tracking-widest inline-flex items-center gap-2">
            <Radio className="w-4 h-4 animate-pulse" /> NORA MÓVIL • EXTERIORES
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-black leading-tight uppercase">
              ¿PRESENCIAS UN SUCESO EN LA CALLE O BARRIO?
            </h2>
            <p className="text-sm font-bold text-red-600 uppercase">
              ¡Envía audio, fotos o relatos al estudio en tiempo real!
            </p>
          </div>

          {/* QR Container */}
          <div className="bg-slate-100 p-6 rounded-2xl border-2 border-slate-300 inline-block shadow-inner">
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="Código QR Nora Móvil Exteriores" 
                className="w-64 h-64 mx-auto rounded-lg shadow-md"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center font-mono text-xs text-slate-500">
                Generando Código QR...
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700">
              Escanea este Código QR con la cámara de tu celular para abrir la terminal de Nora Móvil.
            </p>
            <span className="text-[11px] font-mono text-slate-600 block break-all font-bold">
              {targetUrl}
            </span>
            <div className="text-[10px] text-slate-500 font-mono bg-slate-100 py-1 px-2 rounded">
              PIN de cronista acreditado: <strong>MovilCalle123</strong>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span>Soporte: <strong>Nexora One</strong></span>
            <span>Redacción: <strong>Prensa NexoraOne • Cadena 4</strong></span>
          </div>
        </div>

        {/* Action Controls & Guidelines */}
        <div className="space-y-6">
          <div className="bg-slate-950 border border-white/10 p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-red-500" /> Acciones Inmediatas
            </h3>

            <div className="space-y-3">
              <a
                href="/corresponsal-movil"
                target="_blank"
                rel="noreferrer"
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-orange-500/20"
              >
                <ExternalLink className="w-4 h-4" /> 📲 Abrir Nora Móvil en este Dispositivo
              </a>

              <button
                onClick={handleShareWhatsApp}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-md shadow-emerald-600/20"
              >
                <Share2 className="w-4 h-4" /> 💬 Enviar Acceso a Movileros por WhatsApp
              </button>

              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download="QR_Nora_Movil_Exteriores.png"
                  className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
                >
                  <Download className="w-4 h-4" /> Descargar Código QR (PNG HD)
                </a>
              )}

              <button
                onClick={handlePrint}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
              >
                <Printer className="w-4 h-4" /> Imprimir Cartelera / Afiche
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-white/10 text-gray-300 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all"
              >
                {copied ? (
                  <> <Check className="w-4 h-4 text-emerald-400" /> Enlace Copiado al Portapapeles </>
                ) : (
                  <> <Copy className="w-4 h-4 text-amber-400" /> Copiar Enlace Directo </>
                )}
              </button>
            </div>
          </div>

          {/* Legal Protection Card Summary */}
          <div className="bg-amber-950/40 border border-amber-500/30 p-5 rounded-2xl space-y-2 text-xs text-amber-200">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <ShieldAlert className="w-4 h-4" /> Blindaje Editorial y Filtro Anti-Fake News
            </div>
            <p className="leading-relaxed">
              Todo material enviado desde exteriores ingresa en estado <strong>Pendiente de Revisión</strong> en la sección <strong>Calle & Corresponsalía</strong>. El editor de piso tiene la potestad de escuchar el audio, verificar los hechos y generar copys para redes sociales con un solo clic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
