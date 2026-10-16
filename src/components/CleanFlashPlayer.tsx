"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, ShieldCheck, Radio, Sparkles, Layers } from "lucide-react";

type Segment = {
  clip_id?: number;
  video_url?: string;
  youtube_id?: string;
  start_time_seconds: number;
  end_time_seconds: number;
  title: string;
  summary?: string;
  source_title?: string;
};

type CleanFlashPlayerProps = {
  videoUrl: string;
  segments?: Segment[];
  totalDurationSeconds?: number;
  title: string;
  partnerName?: string;
};

export default function CleanFlashPlayer({
  videoUrl,
  segments = [],
  totalDurationSeconds,
  title,
  partnerName = "Cadena 4"
}: CleanFlashPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [currentFlashTime, setCurrentFlashTime] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Helper to extract YouTube Video ID
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const defaultYtId = getYouTubeId(videoUrl);

  // Normalize segments with YouTube ID fallback
  const activeSegments: Segment[] = (segments && segments.length > 0)
    ? segments.map(s => ({
        ...s,
        youtube_id: s.youtube_id || getYouTubeId(s.video_url || "") || defaultYtId || undefined
      }))
    : [{
        start_time_seconds: 0,
        end_time_seconds: totalDurationSeconds || 180,
        title: title,
        youtube_id: defaultYtId || undefined
      }];

  const calculatedTotalDuration = totalDurationSeconds || activeSegments.reduce((acc, s) => acc + Math.max(0, s.end_time_seconds - s.start_time_seconds), 0);

  const currentSeg = activeSegments[currentSegmentIdx] || activeSegments[0];
  const activeYtId = currentSeg.youtube_id || defaultYtId;

  // Initialize YouTube API Player
  useEffect(() => {
    if (!activeYtId) return;

    let isSubscribed = true;

    const loadYtApi = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        initPlayer();
      } else {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        (window as any).onYouTubeIframeAPIReady = () => {
          if (isSubscribed) initPlayer();
        };
      }
    };

    const initPlayer = () => {
      if (playerRef.current) return;

      const firstSeg = activeSegments[0];
      const initialYtId = firstSeg.youtube_id || activeYtId;
      const elementId = `clean-player-${Math.random().toString(36).substring(2, 8)}`;
      
      if (containerRef.current) {
        containerRef.current.innerHTML = `<div id="${elementId}" class="w-full h-full"></div>`;
      }

      playerRef.current = new (window as any).YT.Player(elementId, {
        videoId: initialYtId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
          start: firstSeg.start_time_seconds,
          end: firstSeg.end_time_seconds
        },
        events: {
          onReady: () => {
            if (isSubscribed) {
              setIsReady(true);
              setIsPlaying(true);
              startPlaybackMonitor();
            }
          },
          onStateChange: (event: any) => {
            if (event.data === (window as any).YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setIsCompleted(false);
            } else if (event.data === (window as any).YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === (window as any).YT.PlayerState.ENDED) {
              handleSegmentEnded();
            }
          }
        }
      });
    };

    loadYtApi();

    return () => {
      isSubscribed = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (playerRef.current && playerRef.current.destroy) {
        try { playerRef.current.destroy(); } catch (e) {}
      }
      playerRef.current = null;
    };
  }, [activeYtId]);

  const startPlaybackMonitor = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (!playerRef.current || !playerRef.current.getCurrentTime) return;

      try {
        const currentTime = playerRef.current.getCurrentTime();
        const seg = activeSegments[currentSegmentIdx] || activeSegments[0];

        if (currentTime >= seg.end_time_seconds) {
          handleSegmentEnded();
        } else {
          // Calculate elapsed time within total Flash duration
          let accumulatedPrev = 0;
          for (let i = 0; i < currentSegmentIdx; i++) {
            accumulatedPrev += Math.max(0, activeSegments[i].end_time_seconds - activeSegments[i].start_time_seconds);
          }
          const elapsedInSeg = Math.max(0, currentTime - seg.start_time_seconds);
          setCurrentFlashTime(Math.min(calculatedTotalDuration, accumulatedPrev + elapsedInSeg));
        }
      } catch (e) {}
    }, 250);
  };

  const handleSegmentEnded = () => {
    if (currentSegmentIdx < activeSegments.length - 1) {
      const nextIdx = currentSegmentIdx + 1;
      const nextSeg = activeSegments[nextIdx];
      const prevSeg = activeSegments[currentSegmentIdx];
      setCurrentSegmentIdx(nextIdx);

      if (playerRef.current) {
        const nextYtId = nextSeg.youtube_id || defaultYtId;
        const prevYtId = prevSeg.youtube_id || defaultYtId;

        if (nextYtId !== prevYtId && playerRef.current.loadVideoById) {
          // Switch to a DIFFERENT video source dynamically!
          playerRef.current.loadVideoById({
            videoId: nextYtId,
            startSeconds: nextSeg.start_time_seconds,
            endSeconds: nextSeg.end_time_seconds
          });
        } else if (playerRef.current.seekTo) {
          // Same video source, seek to next clip start time
          playerRef.current.seekTo(nextSeg.start_time_seconds, true);
          playerRef.current.playVideo();
        }
      }
    } else {
      // Reached end of Flash
      setIsPlaying(false);
      setIsCompleted(true);
      setCurrentFlashTime(calculatedTotalDuration);
      if (playerRef.current && playerRef.current.pauseVideo) {
        playerRef.current.pauseVideo();
      }
    }
  };

  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    if (isCompleted) {
      handleReplay();
      return;
    }
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const handleReplay = () => {
    setCurrentSegmentIdx(0);
    setCurrentFlashTime(0);
    setIsCompleted(false);
    if (playerRef.current) {
      const firstSeg = activeSegments[0];
      const firstYtId = firstSeg.youtube_id || defaultYtId;
      if (firstYtId && playerRef.current.loadVideoById) {
        playerRef.current.loadVideoById({
          videoId: firstYtId,
          startSeconds: firstSeg.start_time_seconds,
          endSeconds: firstSeg.end_time_seconds
        });
      }
      setIsPlaying(true);
    }
  };

  const progressPercent = Math.min(100, Math.max(0, (currentFlashTime / (calculatedTotalDuration || 1)) * 100));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Distinct sources count
  const uniqueSourcesCount = Array.from(new Set(activeSegments.map(s => s.youtube_id || defaultYtId).filter(Boolean))).length;

  return (
    <div className="relative bg-slate-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl space-y-0 select-none">
      {/* Top Branding Header */}
      <div className="bg-gradient-to-r from-red-950 via-black to-slate-900 px-4 py-2.5 border-b border-red-500/30 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-[11px] font-black text-white uppercase tracking-wider">
            Nexora Clean Player
          </span>
          {uniqueSourcesCount > 1 && (
            <span className="text-[10px] bg-purple-600/30 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
              <Layers className="w-3 h-3" /> Multi-Programa ({uniqueSourcesCount} transmisiones)
            </span>
          )}
        </div>
        <div className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Powered by <strong className="text-white">Nexora One</strong>
        </div>
      </div>

      {/* Video Container Area */}
      <div className="relative aspect-video bg-black overflow-hidden">
        {/* YouTube API Target */}
        <div ref={containerRef} className="w-full h-full pointer-events-none" />

        {/* Completed Plaque Overlay */}
        {isCompleted && (
          <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-slate-950/95 to-black z-30 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 bg-red-600/20 border border-red-500/40 rounded-full flex items-center justify-center text-red-500 shadow-2xl">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-black text-red-500 uppercase tracking-widest block">
                🔴 FLASH NOTICIOSO CONCLUIDO
              </span>
              <h3 className="text-xl font-extrabold text-white max-w-lg leading-snug">{title}</h3>
              <p className="text-xs text-gray-400 max-w-md">
                Síntesis periodística multi-programa procesada con Nora AI para {partnerName}.
              </p>
            </div>

            <button
              onClick={handleReplay}
              className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Volver a Reproducir Flash (5 min)
            </button>

            <div className="pt-2 text-[10px] text-gray-500 border-t border-white/10 w-full max-w-xs text-center font-mono">
              Desarrollado por <strong>Nexora One</strong> para Prensa NexoraOne • Cadena 4 © Todos los derechos reservados
            </div>
          </div>
        )}
      </div>

      {/* Custom Exclusive Clean Progress Bar (0 to 5 min) */}
      <div className="bg-slate-900 p-4 border-t border-white/10 space-y-2">
        {/* Progress Line */}
        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden relative cursor-pointer">
          <div
            className="bg-gradient-to-r from-red-600 via-amber-500 to-red-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Controls and Exclusive Flash Duration Counter */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <button
              onClick={handleTogglePlay}
              className="w-9 h-9 bg-red-600 hover:bg-red-500 text-white rounded-xl flex items-center justify-center transition-all shadow-lg"
            >
              {isCompleted ? (
                <RotateCcw className="w-4 h-4" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>

            <div>
              <span className="text-xs font-bold text-white block line-clamp-1">{title}</span>
              <span className="text-[10px] text-gray-400 block font-mono">
                Segmento {currentSegmentIdx + 1} de {activeSegments.length}: {currentSeg.title} {currentSeg.source_title ? `(${currentSeg.source_title})` : ''}
              </span>
            </div>
          </div>

          <div className="text-right font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-lg border border-amber-400/20">
            {formatTime(currentFlashTime)} / {formatTime(calculatedTotalDuration)}
          </div>
        </div>

        {/* Footer Credit Signature */}
        <div className="pt-2 text-[10px] text-gray-400 border-t border-white/5 flex items-center justify-between">
          <span>Infraestructura Periodística Digital por <strong>Nexora One</strong></span>
          <span className="text-red-400 font-bold uppercase font-sans">© Cadena 4</span>
        </div>
      </div>
    </div>
  );
}

