"use client";

import React, { useState } from "react";
import { X, Copy, Check, Share2, Send, Globe, Loader2, Sparkles } from "lucide-react";

interface QuickShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: {
    id: string;
    title: string;
    excerpt?: string;
    content?: string;
    image_url?: string;
  } | null;
}

export default function QuickShareModal({ isOpen, onClose, article }: QuickShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [copyText, setCopyText] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  React.useEffect(() => {
    if (article && isOpen) {
      const defaultCopy = `📢 ÚLTIMA HORA • CADENA 4\n\n${article.title}\n\n${article.excerpt || ""}\n\nConozca todos los detalles de esta noticia en desarrollo.\n\n#Noticias #Actualidad #Cadena4 #PrensaNexoraOne`;
      setCopyText(defaultCopy);
      setDispatchStatus(null);
    }
  }, [article, isOpen]);

  if (!isOpen || !article) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateAiCopy = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch("/api/dispatch/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_copy",
          title: article.title,
          excerpt: article.excerpt || "",
        }),
      });
      const data = await res.json();
      if (data.copy) {
        setCopyText(data.copy);
      }
    } catch (e) {
      console.warn("Error generando copy IA:", e);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleDispatchAll = async () => {
    setDispatching(true);
    setDispatchStatus("Enviando a plataformas conectadas...");
    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: article.id,
          title: article.title,
          content: article.content || article.excerpt,
          excerpt: article.excerpt,
          imageUrl: article.image_url,
          socialCaption: copyText,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setDispatchStatus("✅ ¡Publicado exitosamente en WordPress y Redes Sociales!");
      } else {
        setDispatchStatus(`⚠️ Despacho parcial: ${result.message || "Revise las configuraciones de canales"}`);
      }
    } catch (err: any) {
      setDispatchStatus(`❌ Error de conexión: ${err?.message || err}`);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-red-500" />
            <h3 className="font-serif font-black text-white text-base tracking-wide uppercase">
              Asistente de Distribución Omnicanal
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Copy Periodístico Neutro Latino
            </label>
            <button
              onClick={handleGenerateAiCopy}
              disabled={loadingAi}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loadingAi ? "Redactando con Nora..." : "Regenerar con IA"}
            </button>
          </div>

          <textarea
            value={copyText}
            onChange={(e) => setCopyText(e.target.value)}
            rows={6}
            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500 transition-colors leading-relaxed"
          />

          {dispatchStatus && (
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-slate-200">
              {dispatchStatus}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado" : "Copiar Texto"}
          </button>

          <button
            onClick={handleDispatchAll}
            disabled={dispatching}
            className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {dispatching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Globe className="w-4 h-4" />
            )}
            <span>{dispatching ? "Despachando..." : "1-Clic: Publicar en Todos los Medios"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
