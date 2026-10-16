"use client";

import { useEffect, useState } from "react";
import { Play, Sparkles, Copy, Check, Video, Clock, Share2, Film, Loader2, ArrowRight, Zap, Radio, Download, Inbox, ShieldCheck, Layers, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import CleanFlashPlayer from "@/components/CleanFlashPlayer";

type ClipItem = {
  clip_id: number;
  video_url?: string;
  source_title?: string;
  title: string;
  start_time_seconds: number;
  end_time_seconds: number;
  start_timestamp: string;
  end_timestamp: string;
  duration_seconds: number;
  summary: string;
  impact_score: number;
  category: string;
  social_caption: string;
};

type SuggestedFlash = {
  title: string;
  summary: string;
  target_duration_seconds: number;
  clip_ids: number[];
};

type ClipperResponse = {
  video_summary: string;
  total_clips_found: number;
  suggested_news_flash?: SuggestedFlash;
  clips: ClipItem[];
};

type PartnerVideo = {
  id: string;
  partner_name: string;
  title: string;
  video_url: string;
  notes: string;
  status: string;
  created_at: string;
};

export default function NoraClipperAdminPage() {
  const [youtubeUrlsText, setYoutubeUrlsText] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultData, setResultData] = useState<ClipperResponse | null>(null);
  const [activeClip, setActiveClip] = useState<ClipItem | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Partner Videos Inbox State
  const [partnerVideos, setPartnerVideos] = useState<PartnerVideo[]>([]);
  const [isLoadingPartnerVideos, setIsLoadingPartnerVideos] = useState(false);

  // Flash de Noticias assembly state
  const [selectedFlashClipIds, setSelectedFlashClipIds] = useState<number[]>([]);
  const [flashTitle, setFlashTitle] = useState("");
  const [isPublishingFlash, setIsPublishingFlash] = useState(false);
  const [flashSuccessMsg, setFlashSuccessMsg] = useState<string | null>(null);

  // Fetch Partner Videos inbox
  const fetchPartnerVideos = async () => {
    setIsLoadingPartnerVideos(true);
    try {
      const res = await fetch("/api/partner-videos?limit=10");
      const json = await res.json();
      if (json.success && json.videos) {
        setPartnerVideos(json.videos);
      }
    } catch (e) {
      console.error("Error cargando videos de socios:", e);
    } finally {
      setIsLoadingPartnerVideos(false);
    }
  };

  useEffect(() => {
    fetchPartnerVideos();
  }, []);

  const getYouTubeId = (url?: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleAnalyze = async () => {
    const urlsList = youtubeUrlsText
      .split(/[\n,]+/)
      .map(u => u.trim())
      .filter(Boolean);

    if (urlsList.length === 0) {
      alert("Por favor ingresa al menos 1 enlace de video de YouTube/transmisión.");
      return;
    }

    setIsAnalyzing(true);
    setResultData(null);
    setActiveClip(null);
    setSelectedFlashClipIds([]);
    setFlashSuccessMsg(null);

    try {
      const res = await fetch("/api/nora-clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: urlsList,
          videoTitle: videoTitle || "Coberturas y Noticieros del Día"
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setResultData(json.data);
        if (json.data.clips && json.data.clips.length > 0) {
          setActiveClip(json.data.clips[0]);
          const defaultFlashIds = json.data.suggested_news_flash?.clip_ids || json.data.clips.slice(0, 5).map((c: ClipItem) => c.clip_id);
          setSelectedFlashClipIds(defaultFlashIds);
          setFlashTitle(json.data.suggested_news_flash?.title || `🔴 FLASH MULTI-NOTICIAS: ${videoTitle || "Resumen del Día"}`);
        }
      } else {
        alert("Error analizando los videos: " + (json.error || "Revisa los enlaces enviados."));
      }
    } catch (e: any) {
      alert("Error de conexión: " + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProcessPartnerVideo = (pv: PartnerVideo) => {
    setYoutubeUrlsText(pv.video_url);
    setVideoTitle(`${pv.partner_name}: ${pv.title}`);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleToggleFlashClip = (clipId: number) => {
    if (selectedFlashClipIds.includes(clipId)) {
      setSelectedFlashClipIds(selectedFlashClipIds.filter(id => id !== clipId));
    } else {
      setSelectedFlashClipIds([...selectedFlashClipIds, clipId]);
    }
  };

  const selectedClipsList = (resultData?.clips || []).filter(c => selectedFlashClipIds.includes(c.clip_id));
  const cumulativeDurationSeconds = selectedClipsList.reduce((acc, c) => acc + c.duration_seconds, 0);

  const handlePublishNewsFlash = async () => {
    if (selectedClipsList.length === 0) {
      alert("Por favor selecciona al menos 1 recorte para ensamblar el Flash de Noticias.");
      return;
    }

    setIsPublishingFlash(true);
    setFlashSuccessMsg(null);

    try {
      const firstClip = selectedClipsList[0];
      const primaryUrl = firstClip.video_url || youtubeUrlsText.split("\n")[0];
      const ytId = getYouTubeId(primaryUrl);
      const embedUrl = ytId
        ? `https://www.youtube.com/embed/${ytId}?start=${firstClip.start_time_seconds}&end=${firstClip.end_time_seconds}&autoplay=1`
        : primaryUrl;
      const thumbnailUrl = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;

      const combinedSummary = selectedClipsList.map(c => `• [${c.source_title || "Programa"}] ${c.title}: ${c.summary}`).join("\n");

      const res = await fetch("/api/flashes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: flashTitle.trim() || "🔴 Flash de Noticias Multi-Programa Nexativa",
          summary: combinedSummary,
          duration_seconds: cumulativeDurationSeconds,
          video_url: primaryUrl,
          thumbnail_url: thumbnailUrl,
          embed_url: embedUrl,
          segments: selectedClipsList,
          category: firstClip.category || "nacional",
          partner_visible: true,
          status: "published"
        })
      });

      const json = await res.json();
      if (json.success) {
        setFlashSuccessMsg("🎉 ¡Flash Noticioso Multi-Programa (1-5 min) publicado con éxito! Transmitiendo con el reproductor limpio Nexativa Clean Player (por Nexora One).");
      } else {
        alert("Error al publicar Flash: " + json.error);
      }
    } catch (e: any) {
      alert("Error al conectar con la API de Flashes: " + e.message);
    } finally {
      setIsPublishingFlash(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-950 via-black to-slate-900 border border-red-500/30 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-500/30 rounded-full text-red-400 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" /> Multi-Programa Flash Producer (Hasta 5 Videos)
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Ensamblador Noticioso Multi-Video (1 a 5 min)
          </h1>
          <p className="text-gray-400 text-sm max-w-3xl">
            Ingresa hasta **5 transmisiones o programas del día** (ej. Mañana, Mediodía, Noche). Nora IA analizará el lote completo y te permitirá mezclar clips de distintos programas en un único **Flash Noticioso continuo**.
          </p>
        </div>
        <div className="text-[10px] text-gray-400 bg-black/60 border border-white/10 px-3 py-2 rounded-xl text-right font-mono">
          Desarrollado por <strong className="text-white">Nexora One</strong>
          <span className="block text-red-400 font-bold font-sans uppercase">Prensa NexoraOne • Cadena 4 ©</span>
        </div>
      </div>

      {/* PARTNER VIDEOS INBOX (TÚNEL DIRECTO) */}
      <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-extrabold text-white">📥 Coberturas & Programas Entrantes de Socios</h2>
          </div>
          <button
            onClick={fetchPartnerVideos}
            className="text-xs text-amber-400 font-bold hover:underline"
          >
            Refrescar Bandeja
          </button>
        </div>

        {partnerVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {partnerVideos.map((pv) => (
              <div key={pv.id} className="bg-white/5 border border-white/10 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                    {pv.partner_name}
                  </span>
                  <span className="text-gray-400 font-mono text-[10px]">
                    {new Date(pv.created_at).toLocaleDateString([], { month: "short", day: "2-digit" })}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white line-clamp-1">{pv.title}</h4>
                {pv.notes && <p className="text-xs text-gray-400 line-clamp-1">{pv.notes}</p>}
                
                <button
                  onClick={() => handleProcessPartnerVideo(pv)}
                  className="w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Zap className="w-3.5 h-3.5" /> ⚡ Cargar en Nora Clipper
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">
            No hay videos entrantes pendientes de socios en este momento.
          </p>
        )}
      </div>

      {/* Input Box for Multi-Videos (Up to 5 URLs) */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Film className="w-4 h-4 text-red-500" /> Links de Videos / Programas del Día (Hasta 5 URLs)
              </span>
              <span className="text-[10px] text-amber-400 font-mono">1 enlace por línea</span>
            </label>
            <textarea 
              value={youtubeUrlsText}
              onChange={(e) => setYoutubeUrlsText(e.target.value)}
              placeholder="Pega las URLs de tus programas del día (hasta 5 links):&#10;https://www.youtube.com/watch?v=... (Noticiero Mañana)&#10;https://www.youtube.com/watch?v=... (Noticiero Noche)"
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 font-mono resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Título / Referencia del Lote Periodístico
            </label>
            <input 
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="Ej: Emisiones del Día / Noticieros Cadena 4"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50"
            />
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !youtubeUrlsText.trim()}
          className="w-full md:w-auto bg-gradient-to-r from-red-600 via-amber-600 to-red-800 hover:from-red-500 hover:to-amber-500 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Analizando Lote de Programas con Nora IA...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> Decodificar Programas & Producir Flash Noticioso
            </>
          )}
        </button>
      </div>

      {/* Results View */}
      {resultData && (
        <div className="space-y-8 animate-fadeIn">
          {/* Top Bar Summary */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Resumen Ejecutivo del Lote de Programas</span>
              <p className="text-white text-base mt-1 font-medium">{resultData.video_summary}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl text-center flex-shrink-0">
              <span className="text-2xl font-black text-red-500">{resultData.total_clips_found}</span>
              <span className="block text-[10px] text-gray-400 uppercase font-bold">Clips Destacados</span>
            </div>
          </div>

          {/* FLASH NOTICIOSO ASSEMBLY SECTION */}
          <div className="bg-gradient-to-br from-red-950/60 via-black to-slate-900 border-2 border-red-500/40 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-red-500/20 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-red-500 uppercase tracking-widest">
                  <Radio className="w-4 h-4 animate-pulse" /> Ensamblador Multi-Programa de Flash Noticioso (1 a 5 min)
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">Mezclador de Recortes del Día</h2>
              </div>
              <div className="flex items-center gap-3 bg-black/60 border border-white/10 px-4 py-2 rounded-xl">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-gray-400">Duración Acumulada:</span>
                <span className="text-lg font-black text-amber-400">
                  {Math.floor(cumulativeDurationSeconds / 60)}m {cumulativeDurationSeconds % 60}s
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1">
                  Título del Flash Noticioso Combinado
                </label>
                <input 
                  type="text"
                  value={flashTitle}
                  onChange={(e) => setFlashTitle(e.target.value)}
                  placeholder="Título del Flash..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white font-bold"
                />
              </div>

              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Selecciona los recortes de los distintos programas para unir en el Flash:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {resultData.clips.map((clip) => {
                  const isSelected = selectedFlashClipIds.includes(clip.clip_id);
                  return (
                    <div
                      key={`flash-select-${clip.clip_id}`}
                      onClick={() => handleToggleFlashClip(clip.clip_id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isSelected 
                          ? "bg-red-900/30 border-red-500 text-white shadow-lg" 
                          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-bold uppercase">
                            {clip.source_title || "Programa"}
                          </span>
                          <span className="text-xs font-mono text-amber-400">{clip.start_timestamp} - {clip.end_timestamp}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white line-clamp-1">{clip.title}</h4>
                        <p className="text-xs text-gray-400 line-clamp-2">{clip.summary}</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => {}} 
                        className="mt-1 w-5 h-5 accent-red-600 rounded cursor-pointer flex-shrink-0"
                      />
                    </div>
                  );
                })}
              </div>

              {flashSuccessMsg && (
                <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-sm font-medium">
                  {flashSuccessMsg}
                </div>
              )}

              <button
                onClick={handlePublishNewsFlash}
                disabled={isPublishingFlash || selectedClipsList.length === 0}
                className="w-full bg-gradient-to-r from-red-600 via-amber-600 to-red-700 hover:from-red-500 hover:to-amber-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider disabled:opacity-50"
              >
                {isPublishingFlash ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Publicando Flash Noticioso Multi-Programa...
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" /> 🚀 Publicar Flash Noticioso Combinado ({selectedClipsList.length} clips • {Math.floor(cumulativeDurationSeconds / 60)}m {cumulativeDurationSeconds % 60}s)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* MAIN CLEAN PLAYER & INDIVIDUAL CLIPS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Player Column */}
            <div className="lg:col-span-2 space-y-4">
              {activeClip ? (
                <CleanFlashPlayer
                  videoUrl={activeClip.video_url || youtubeUrlsText.split("\n")[0]}
                  segments={selectedClipsList.length > 0 ? selectedClipsList : [activeClip]}
                  totalDurationSeconds={cumulativeDurationSeconds || activeClip.duration_seconds}
                  title={flashTitle || activeClip.title}
                  partnerName="Nexativa Studio"
                />
              ) : (
                <div className="bg-black/40 border border-white/10 rounded-2xl p-12 text-center text-gray-400">
                  Selecciona un clip de la lista para ver la previsualización.
                </div>
              )}
            </div>

            {/* Clips List Column */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-red-500" /> Momentos Clave Identificados ({resultData.clips.length})
              </h3>

              <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
                {resultData.clips.map((clip) => (
                  <div
                    key={clip.clip_id}
                    onClick={() => setActiveClip(clip)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                      activeClip?.clip_id === clip.clip_id
                        ? "bg-red-950/40 border-red-500/80 shadow-lg"
                        : "bg-black/30 border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="font-mono text-amber-400 font-bold">{clip.source_title || "Programa"} ({clip.start_timestamp} - {clip.end_timestamp})</span>
                      <span className="text-red-400 font-bold">Puntaje: {clip.impact_score}/10</span>
                    </div>

                    <h4 className="text-sm font-bold text-white line-clamp-2">{clip.title}</h4>
                    <p className="text-xs text-gray-400 line-clamp-2">{clip.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

