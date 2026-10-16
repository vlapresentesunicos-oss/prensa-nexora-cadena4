"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  Send, 
  Globe, 
  Loader2, 
  Sparkles,
  Camera,
  MessageSquare,
  Radio,
  ExternalLink
} from "lucide-react";

interface QuickShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: {
    id: string;
    title: string;
    excerpt?: string;
    content?: string;
    image_url?: string;
    source?: string;
  } | null;
}

export default function QuickShareModal({ isOpen, onClose, article }: QuickShareModalProps) {
  const [platform, setPlatform] = useState<"social" | "messaging" | "wordpress">("social");
  const [copyText, setCopyText] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  // Genera automáticamente el copy inicial según la plataforma seleccionada
  useEffect(() => {
    if (article && isOpen) {
      if (platform === "social") {
        setCopyText(
          `🚨 ÚLTIMA HORA • CADENA 4\n\n${article.title}\n\n${article.excerpt || "Información de último momento transmitida a través de la red informativa de Cadena 4."}\n\n📲 Conozca todos los detalles y el reporte ampliado en nuestro portal.\n\n#Noticias #Cadena4 #Actualidad #Exteriores #PrensaNexoraOne`
        );
      } else if (platform === "messaging") {
        setCopyText(
          `🔴 *CADENA 4 • ALERTA INFORMATIVA*\n\n*${article.title}*\n\n${article.excerpt || ""}\n\n👉 Más información en https://cadena4.com.ar`
        );
      } else {
        setCopyText(
          `TITULAR: ${article.title}\n\nCOPETE: ${article.excerpt || ""}\n\nCONTENIDO SINDICADO:\n${article.content || ""}`
        );
      }
      setCopied(false);
      setDispatchStatus(null);
    }
  }, [article, isOpen, platform]);

  if (!isOpen || !article) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Adaptación con Nora AI en tiempo real
  const handleGenerateAiCopy = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch("/api/nora-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Por favor adapta este suceso para difusión en redes sociales (${platform === "social" ? "Instagram y Facebook" : platform === "messaging" ? "WhatsApp y Telegram" : "Portal WordPress"}):\nTITULAR: "${article.title}"\nDATOS: "${article.excerpt || article.content || ""}"`,
          currentDraft: "",
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setCopyText(data.reply);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(false);
    }
  };

  // Despacho 1-Clic a todas las redes y WordPress conectadas
  const handleDispatchAll = async () => {
    setDispatching(true);
    setDispatchStatus("🚀 Despachando a WordPress, Meta y Telegram...");
    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: article.id,
          title: article.title,
          content: article.content || article.excerpt || article.title,
          excerpt: article.excerpt,
          imageUrl: article.image_url,
          socialCaption: copyText,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setDispatchStatus("✅ ¡Publicado exitosamente en WordPress y Redes Sociales de Cadena 4!");
      } else {
        setDispatchStatus(`⚠️ Despacho completado con avisos: ${result.message || "Revise las credenciales en Ajustes"}`);
      }
    } catch (err: any) {
      setDispatchStatus(`❌ Error de red: ${err?.message || err}`);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-4 p-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl text-white shadow-lg">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-black text-white text-base tracking-wide uppercase">
                Adaptar & Publicar en Redes Sociales
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Cadena 4 • Orquestador Omnicanal Asistido por Nora
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Red / Formato */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setPlatform("social")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              platform === "social" 
                ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Instagram / Facebook</span>
          </button>

          <button
            type="button"
            onClick={() => setPlatform("messaging")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              platform === "messaging" 
                ? "bg-emerald-600 text-white shadow-md" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp / Telegram</span>
          </button>

          <button
            type="button"
            onClick={() => setPlatform("wordpress")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              platform === "wordpress" 
                ? "bg-blue-600 text-white shadow-md" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>WordPress Portal</span>
          </button>
        </div>

        {/* Copy Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <span>Texto Adaptado para Difusión</span>
            </label>
            <button
              onClick={handleGenerateAiCopy}
              disabled={loadingAi}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loadingAi ? "Nora adaptando copy..." : "Reescribir con Nora"}
            </button>
          </div>

          <textarea
            value={copyText}
            onChange={(e) => setCopyText(e.target.value)}
            rows={6}
            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500 transition-colors leading-relaxed font-sans"
          />

          {dispatchStatus && (
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-slate-200">
              {dispatchStatus}
            </div>
          )}
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copiado al Portapapeles" : "Copiar Texto"}</span>
          </button>

          <button
            type="button"
            onClick={handleDispatchAll}
            disabled={dispatching}
            className="w-full sm:flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 hover:opacity-90 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {dispatching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{dispatching ? "Publicando en Redes..." : "1-Clic: Publicar en Redes & Portal"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
