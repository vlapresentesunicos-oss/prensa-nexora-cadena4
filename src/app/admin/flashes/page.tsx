"use client";

import { useEffect, useState } from "react";
import { Radio, Play, Clock, Sparkles, Share2, Copy, Check, Eye, ExternalLink, Code, Layers, RefreshCw, ShieldCheck } from "lucide-react";
import CleanFlashPlayer from "@/components/CleanFlashPlayer";

type NewsFlash = {
  id: string;
  title: string;
  summary: string;
  duration_seconds: number;
  video_url: string;
  thumbnail_url: string | null;
  embed_url: string | null;
  segments: any[];
  category: string;
  status: string;
  partner_visible: boolean;
  views_count: number;
  created_at: string;
};

export default function AdminNewsFlashesPage() {
  const [flashes, setFlashes] = useState<NewsFlash[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFlash, setActiveFlash] = useState<NewsFlash | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [embedCopiedId, setEmbedCopiedId] = useState<string | null>(null);

  const fetchFlashes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/flashes?limit=30");
      const json = await res.json();
      if (json.success && json.flashes) {
        setFlashes(json.flashes);
        if (json.flashes.length > 0 && !activeFlash) {
          setActiveFlash(json.flashes[0]);
        }
      }
    } catch (err) {
      console.error("Error cargando flashes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashes();
  }, []);

  const handleCopyEmbed = (flash: NewsFlash) => {
    const embedCode = `<iframe src="${flash.embed_url || flash.video_url}" width="100%" height="450" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setEmbedCopiedId(flash.id);
    setTimeout(() => setEmbedCopiedId(null), 2000);
  };

  const handleCopyTimestamps = (flash: NewsFlash) => {
    let text = `🔴 ${flash.title}\n\n${flash.summary}\n\nMarcas de Tiempo (Timestamps YouTube):\n`;
    if (flash.segments && Array.isArray(flash.segments)) {
      flash.segments.forEach((seg: any) => {
        text += `${seg.start_timestamp || "00:00"} - ${seg.title}\n`;
      });
    }
    navigator.clipboard.writeText(text);
    setCopiedId(flash.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-950 via-black to-slate-900 border border-red-500/30 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-500/30 rounded-full text-red-400 text-xs font-bold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Panel de Producción & Emisión Noticiosa
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Flash de Noticias Cadena 4 (1 a 5 Minutos)
          </h1>
          <p className="text-gray-400 text-sm max-w-2xl">
            Noticieros rápidos generados automáticamente por Nora AI. Emitidos con **Nexora Clean Player** sin barras de 60 minutos ni distracciones.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={fetchFlashes}
            disabled={isLoading}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs uppercase"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} /> Refrescar Emisión
          </button>
          <span className="text-[10px] text-gray-400 font-mono">
            Desarrollado por <strong className="text-white">Nexora One</strong>
          </span>
        </div>
      </div>

      {/* Main Grid: Clean Player + Playlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Player View */}
        <div className="lg:col-span-2 space-y-6">
          {activeFlash ? (
            <div className="space-y-4">
              <CleanFlashPlayer
                videoUrl={activeFlash.video_url}
                segments={activeFlash.segments}
                totalDurationSeconds={activeFlash.duration_seconds}
                title={activeFlash.title}
                partnerName="Prensa NexoraOne • Cadena 4 Studio"
              />

              <div className="bg-slate-950 border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-red-600 text-white font-extrabold text-[10px] uppercase px-2.5 py-1 rounded">
                      {activeFlash.category || "NACIONAL"}
                    </span>
                    <span className="text-amber-400 text-xs font-mono font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {Math.floor(activeFlash.duration_seconds / 60)}m {activeFlash.duration_seconds % 60}s
                    </span>
                  </div>

                  <span className="text-xs text-gray-400 font-mono">
                    Publicado: {new Date(activeFlash.created_at).toLocaleDateString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <h2 className="text-xl font-black text-white leading-snug">{activeFlash.title}</h2>
                <div className="text-gray-300 text-sm whitespace-pre-line bg-white/5 p-4 rounded-xl border border-white/10">
                  {activeFlash.summary}
                </div>

                {/* Actions & Sharing */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => handleCopyEmbed(activeFlash)}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                  >
                    {embedCopiedId === activeFlash.id ? (
                      <> <Check className="w-4 h-4 text-emerald-400" /> Código Embed Copiado </>
                    ) : (
                      <> <Code className="w-4 h-4 text-blue-400" /> Copiar Código Embed (iFrame) </>
                    )}
                  </button>

                  <button
                    onClick={() => handleCopyTimestamps(activeFlash)}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                  >
                    {copiedId === activeFlash.id ? (
                      <> <Check className="w-4 h-4 text-emerald-400" /> Copiado </>
                    ) : (
                      <> <Share2 className="w-4 h-4 text-amber-400" /> Copiar para YouTube / Redes </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-black/40 border border-white/10 rounded-2xl p-12 text-center text-gray-400">
              {isLoading ? "Cargando emisión de Flashes..." : "No hay Flashes de Noticias emitidos. Ve a Nora Auto-Clipper para crear el primero."}
            </div>
          )}
        </div>

        {/* Playlist Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-500" /> Noticieros en Emisión ({flashes.length})
            </h3>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {flashes.map((flash) => {
              const isActive = activeFlash?.id === flash.id;
              return (
                <div
                  key={flash.id}
                  onClick={() => setActiveFlash(flash)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                    isActive 
                      ? "bg-red-950/50 border-red-500 shadow-xl" 
                      : "bg-black/40 border-white/10 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-red-400 uppercase">{flash.category}</span>
                    <span className="text-amber-400 font-mono font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.floor(flash.duration_seconds / 60)}m {flash.duration_seconds % 60}s
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white line-clamp-2">{flash.title}</h4>
                  <p className="text-xs text-gray-400 line-clamp-2">{flash.summary}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

