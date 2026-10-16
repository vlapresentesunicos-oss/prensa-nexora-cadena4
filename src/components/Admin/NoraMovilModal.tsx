"use client";

import React, { useState, useEffect } from "react";
import { X, QrCode, Copy, Check, ExternalLink, Share2, Radio, Smartphone, CheckCircle2 } from "lucide-react";
import QRCode from "qrcode";

interface NoraMovilModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NoraMovilModal({ isOpen, onClose }: NoraMovilModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [fullUrl, setFullUrl] = useState("https://prensa-nexora-cadena4.vercel.app/corresponsal-movil");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/corresponsal-movil`;
      setFullUrl(url);

      QRCode.toDataURL(
        url,
        {
          width: 300,
          margin: 2,
          color: {
            dark: "#ffffff",
            light: "#030712",
          },
        },
        (err, dataUri) => {
          if (!err && dataUri) {
            setQrDataUrl(dataUri);
          }
        }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🎙️ *CADENA 4 • TERMINAL DE EXTERIORES NORA MÓVIL*\n\nAcceso directo para móviles, cronistas y corresponsales:\n${fullUrl}\n\nPIN de Ingreso: *MovilCalle123*\n\n(Ábrelo en tu navegador y selecciona "Agregar a pantalla de inicio" para tener la app nativa en tu celular).`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-orange-500 to-red-600 rounded-2xl text-white shadow-lg shadow-orange-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-black text-white text-base tracking-wide uppercase">
                Nora Periodista de Exteriores
              </h3>
              <p className="text-[11px] text-orange-400 font-mono">
                Terminal Móvil PWA • Cadena 4
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center bg-black/60 p-5 rounded-2xl border border-white/10 space-y-3">
          {qrDataUrl ? (
            <div className="p-3 bg-[#030712] rounded-xl border-2 border-orange-500/40 shadow-xl shadow-orange-500/10">
              <img src={qrDataUrl} alt="QR Nora Móvil" className="w-48 h-48 object-contain rounded-lg" />
            </div>
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-slate-500 text-xs">
              Generando código QR...
            </div>
          )}

          <div className="text-center space-y-1">
            <p className="text-xs text-white/90 font-bold">
              Apunta la cámara del celular para abrir en 1 segundo
            </p>
            <p className="text-[11px] text-slate-400">
              PIN de Acceso Móvil: <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">MovilCalle123</span>
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white/5 border border-white/5 p-3.5 rounded-xl space-y-1 text-[11px] text-slate-300">
          <p className="font-bold text-white flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ¿Cómo instalar el icono de escritorio en tu teléfono?
          </p>
          <p className="text-slate-400 leading-relaxed">
            Una vez abierto en Chrome o Safari, presiona los 3 puntos (o botón Compartir) y elige <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla de inicio"</strong>. Funcionará como una app nativa incluso sin señal de internet en la calle.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "¡Enlace Copiado!" : "Copiar Enlace"}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar por WhatsApp</span>
            </button>
          </div>

          <a
            href="/corresponsal-movil"
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 text-center"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir Nora Móvil en esta Pantalla</span>
          </a>
        </div>

      </div>
    </div>
  );
}
