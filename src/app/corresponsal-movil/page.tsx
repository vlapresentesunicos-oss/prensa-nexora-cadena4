"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Mic,
  Square,
  Upload,
  Send,
  Lock,
  Radio,
  MapPin,
  Camera,
  CheckCircle,
  FileText,
  AlertTriangle,
  RefreshCw,
  Settings,
  X,
  Volume2,
  Trash2,
  UserCheck,
  UserX,
  ShieldAlert,
  Info,
  Video
} from "lucide-react";

import { getClosestLocation } from "@/lib/location-db";

interface SentReport {
  id: string;
  title: string;
  timestamp: string;
  status: string;
  isAnonymous?: boolean;
}

export default function CorresponsalMovilPage() {
  // Mode selection: "acreditado" (PIN required) vs "anonimo" (Public Citizen Journalism)
  const [reportMode, setReportMode] = useState<"acreditado" | "anonimo">("anonimo");
  
  // State for PIN / Auth
  const [pinCode, setPinCode] = useState("");
  const [corresponsalName, setCorresponsalName] = useState("");
  const [isLocked, setIsLocked] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showLegalNotice, setShowLegalNotice] = useState(false);

  // Form Fields
  const [inputText, setInputText] = useState("");
  const [interviewLanguage, setInterviewLanguage] = useState<string>("auto");
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Video Fields & Duración Elegible (60s vs 180s)
  const [maxVideoDuration, setMaxVideoDuration] = useState<60 | 180>(60);
  const [includeCopete, setIncludeCopete] = useState<boolean>(true);

  const [attachedVideo, setAttachedVideo] = useState<File | null>(null);
  const [attachedVideoPreview, setAttachedVideoPreview] = useState<string | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Video Recording & Viewfinder States
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoSecondsLeft, setVideoSecondsLeft] = useState<number>(60);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const videoMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // GPS Location State
  const [coords, setCoords] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>("Buscando ubicación GPS...");

  // UI state
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Local storage of recent sent reports
  const [sentReports, setSentReports] = useState<SentReport[]>([]);

  // Location Auto-Detect with high-precision neighborhood resolution
  const detectLocation = () => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoords(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          
          const loc = getClosestLocation(lat, lng);
          if (loc) {
            setLocationLabel(loc.name);
          } else {
            setLocationLabel(`Zona Urbana (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          }
        },
        (error) => {
          setLocationLabel("Zona Urbana (Ituzaingó)");
          setCoords("-27.5973, -56.6874");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLocationLabel("Zona Urbana (Ituzaingó)");
      setCoords("-27.5973, -56.6874");
    }
  };

  // Load saved credentials & history
  useEffect(() => {
    const savedName = localStorage.getItem("corresponsal_name");
    const savedPin = localStorage.getItem("corresponsal_pin");
    const savedHistory = localStorage.getItem("corresponsal_sent_reports");

    if (savedName) setCorresponsalName(savedName);
    if (savedPin === "1234") {
      setIsLocked(false);
    }
    if (savedHistory) {
      try {
        setSentReports(JSON.parse(savedHistory));
      } catch (e) {}
    }

    detectLocation();
  }, []);

  const handleUnlock = () => {
    if (pinCode === "1234") {
      setIsLocked(false);
      localStorage.setItem("corresponsal_name", corresponsalName || "Periodista Acreditado");
      localStorage.setItem("corresponsal_pin", pinCode);
      setShowSettings(false);
    } else {
      alert("PIN Incorrecto. Contacta a la redacción.");
    }
  };

  // Audio Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedAudio(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("No se pudo acceder al micrófono del celular.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const discardAudio = () => {
    setRecordedAudio(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };


  // Direct upload helper to bypass Vercel 4.5MB payload limits
  const uploadFileDirectToStorage = async (file: File | Blob, folderName: string): Promise<string | null> => {
    try {
      const isAudio = folderName.includes("audio") || file.type.includes("audio");
      const isVideo = folderName.includes("video") || file.type.includes("video");
      const defaultExt = isAudio ? "webm" : isVideo ? "webm" : "jpg";
      const fileName = file instanceof File ? file.name : `${isAudio ? "audio" : isVideo ? "video" : "image"}_${Date.now()}.${defaultExt}`;
      const ext = fileName.split(".").pop() || defaultExt;
      const path = `${folderName}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const fileType = file.type || (ext === "webm" ? (isAudio ? "audio/webm" : "video/webm") : ext === "mp4" ? "video/mp4" : "image/jpeg");

      // 1. Try direct upload using browser Supabase Client
      const { error: uploadErr } = await supabase.storage.from("uploads").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: fileType
      });

      if (!uploadErr) {
        const { data: publicUrlData } = supabase.storage.from("uploads").getPublicUrl(path);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      } else {
        console.warn("Supabase client upload notice, using signed upload fallback:", uploadErr.message);
      }

      // 2. Fallback: Signed Upload URL API with x-upsert header
      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, fileType, folder: folderName })
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (!data.signedUrl) return null;

      const uploadRes = await fetch(data.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": fileType,
          "x-upsert": "true"
        },
        body: file
      });

      if (uploadRes.ok) {
        return data.publicUrl;
      }
      return null;
    } catch (err) {
      console.error("Direct upload error:", err);
      return null;
    }
  };

  const canvasAnimFrameRef = useRef<number | null>(null);
  const isCanvasRecordingRef = useRef<boolean>(false);

  // Open camera stream for Viewfinder
  const openCameraStream = async (mode: "environment" | "user") => {
    try {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      activeStreamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(() => {});
      }
      return stream;
    } catch (err) {
      console.error("Error al abrir cámara:", err);
      alert("No se pudo acceder a la cámara seleccionada. Verifica los permisos.");
      return null;
    }
  };

  const toggleCameraDirection = async () => {
    if (isVideoRecording) return; // Prevent switching mid-recording for maximum stability
    const newMode = cameraFacingMode === "environment" ? "user" : "environment";
    setCameraFacingMode(newMode);
    await openCameraStream(newMode);
  };

  // Video Recording Handlers (Live Viewfinder + 60s max)
  const startVideoRecording = async () => {
    setShowVideoModal(true);
    const stream = await openCameraStream(cameraFacingMode);
    if (!stream) {
      setShowVideoModal(false);
      return;
    }

    try {
      const options = {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : MediaRecorder.isTypeSupported("video/mp4")
          ? "video/mp4"
          : undefined,
        videoBitsPerSecond: 1500000
      };

      videoMediaRecorderRef.current = new MediaRecorder(stream, options);
      videoChunksRef.current = [];

      videoMediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      videoMediaRecorderRef.current.onstop = () => {
        if (activeStreamRef.current) {
          activeStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        const videoBlob = new Blob(videoChunksRef.current, { type: "video/webm" });
        setRecordedVideo(videoBlob);
        setRecordedVideoUrl(URL.createObjectURL(videoBlob));
        setShowVideoModal(false);
      };

      videoMediaRecorderRef.current.start(500);
      setIsVideoRecording(true);
      setVideoSecondsLeft(maxVideoDuration);

      videoTimerRef.current = setInterval(() => {
        setVideoSecondsLeft((prev) => {
          if (prev <= 1) {
            if (videoMediaRecorderRef.current && videoMediaRecorderRef.current.state !== "inactive") {
              videoMediaRecorderRef.current.stop();
            }
            setIsVideoRecording(false);
            if (videoTimerRef.current) clearInterval(videoTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      alert("No se pudo iniciar la grabación de video.");
      setShowVideoModal(false);
    }
  };

  const stopVideoRecording = () => {
    if (videoMediaRecorderRef.current && isVideoRecording) {
      if (videoMediaRecorderRef.current.state !== "inactive") {
        videoMediaRecorderRef.current.stop();
      }
      setIsVideoRecording(false);
      if (videoTimerRef.current) clearInterval(videoTimerRef.current);
    } else {
      setShowVideoModal(false);
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const discardVideo = () => {
    setRecordedVideo(null);
    setRecordedVideoUrl(null);
    setAttachedVideo(null);
    setAttachedVideoPreview(null);
    setVideoSecondsLeft(maxVideoDuration);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachedImage(file);
      setAttachedImagePreview(URL.createObjectURL(file));
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 100 * 1024 * 1024) {
        alert("El video supera los 100MB. Sube una filmación de hasta 5 minutos.");
        return;
      }
      setAttachedVideo(file);
      setAttachedVideoPreview(URL.createObjectURL(file));
    }
  };

  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const max = 1200;

        if (width > height && width > max) {
          height = Math.round((height * max) / width);
          width = max;
        } else if (height > max) {
          width = Math.round((width * max) / height);
          height = max;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Error al procesar imagen"));
          },
          "image/jpeg",
          0.8
        );
      };
      img.onerror = (err) => reject(err);
    });
  };

  // Submit Handler
  const handleSubmitReport = async () => {
    if (!inputText.trim() && !attachedImage && !recordedAudio && !attachedVideo && !recordedVideo) {
      alert("Por favor incluye un texto, foto, audio o filmación de video antes de enviar.");
      return;
    }

    setLoading(true);
    setSuccessMsg(null);

    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;
      let audioUrl: string | null = null;

      // Direct signed upload for image to bypass Vercel 4.5MB payload limit
      if (attachedImage) {
        try {
          const resizedBlob = await resizeImage(attachedImage);
          imageUrl = await uploadFileDirectToStorage(resizedBlob, "corresponsales");
        } catch (e) {
          console.warn("Error uploading image directly:", e);
        }
      }

      // Direct signed upload for video to bypass Vercel 4.5MB payload limit
      if (attachedVideo) {
        videoUrl = await uploadFileDirectToStorage(attachedVideo, "corresponsales_video");
      } else if (recordedVideo) {
        videoUrl = await uploadFileDirectToStorage(recordedVideo, "corresponsales_video");
      }

      // Direct signed upload for audio to bypass Vercel 4.5MB payload limit
      if (recordedAudio) {
        try {
          audioUrl = await uploadFileDirectToStorage(recordedAudio, "corresponsales_audio");
        } catch (e) {
          console.warn("Error uploading audio directly:", e);
        }
      }

      const isAnon = reportMode === "anonimo";
      const finalName = isAnon
        ? "Reporte Ciudadano Anónimo (Vecino)"
        : (corresponsalName || "Periodista Acreditado");

      const formData = new FormData();
      formData.append("operator_id", "a8b297ea-5d91-402c-91d4-88ca6e2f19f3");
      formData.append("corresponsal_name", finalName);
      formData.append("geolocation_coordinates", coords || "-27.5973, -56.6874");
      formData.append("raw_metadata_title", `${isAnon ? "🟢 [Reporte Ciudadano]" : "🎤 [Corresponsal]"}: ${finalName}`);
      formData.append("timestamp_utc", new Date().toISOString());
      formData.append("include_copete", includeCopete ? "true" : "false");
      formData.append("max_video_duration", maxVideoDuration.toString());

      if (inputText.trim()) {
        formData.append("draft_text", inputText.trim());
      }
      
      if (audioUrl) {
        formData.append("audio_url", audioUrl);
      }

      const mediaList: string[] = [];
      if (imageUrl) mediaList.push(imageUrl);
      if (videoUrl) mediaList.push(videoUrl);
      if (audioUrl) mediaList.push(audioUrl);

      if (mediaList.length > 0) {
        formData.append("attached_media_url", JSON.stringify(mediaList));
      }

      // Only append raw binaries as fallback if direct upload failed AND file is small (< 3MB)
      if (!imageUrl && attachedImage && attachedImage.size < 3 * 1024 * 1024) {
        formData.append("image", attachedImage);
      }
      if (!videoUrl) {
        if (attachedVideo && attachedVideo.size < 3 * 1024 * 1024) {
          formData.append("video", attachedVideo);
        } else if (recordedVideo && recordedVideo.size < 3 * 1024 * 1024) {
          formData.append("video", recordedVideo, "video.webm");
        }
      }
      if (!audioUrl && recordedAudio && recordedAudio.size < 3 * 1024 * 1024) {
        formData.append("audio", recordedAudio, "reporte.webm");
      }

      const res = await fetch("/api/corresponsal", {
        method: "POST",
        body: formData,
      });

      let resData: any = {};
      const responseText = await res.text();
      try {
        resData = JSON.parse(responseText);
      } catch (e) {
        console.error("[Corresponsal-Movil] Non-JSON server response:", responseText);
        if (res.status === 413) {
          throw new Error("El reporte o los archivos adjuntos exceden el límite de tamaño permitido por el servidor (4.5 MB).");
        }
        throw new Error(`Error en el servidor (${res.status}): ${responseText.substring(0, 100)}`);
      }

      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Fallo en el servidor al procesar la nota.");
      }

      const newReport: SentReport = {
        id: resData.id,
        title: inputText.trim() ? inputText.substring(0, 35) + "..." : videoUrl ? "[Filmación de video 60s]" : "[Reporte de voz]",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: resData.status || "PENDING_REVIEW",
        isAnonymous: isAnon
      };

      const updatedList = [newReport, ...sentReports].slice(0, 8);
      setSentReports(updatedList);
      localStorage.setItem("corresponsal_sent_reports", JSON.stringify(updatedList));

      setInputText("");
      setAttachedImage(null);
      setAttachedImagePreview(null);
      discardVideo();
      discardAudio();
      setSuccessMsg("🎉 ¡Reporte enviado a la redacción de Nexativa!");
      
      detectLocation();
    } catch (err: any) {
      alert("Error al enviar el reporte: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col font-sans relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.1),transparent_40%)] pointer-events-none" />

      {/* Header bar */}
      <header className="bg-[#111625] border-b border-white/10 px-4 py-3 flex justify-between items-center shadow-lg sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Radio className="text-red-500 w-5 h-5 animate-pulse" />
          <div>
            <h1 className="font-bold text-sm tracking-wider uppercase text-gray-200">
              Nora Exteriores & Reporte Ciudadano
            </h1>
            <span className="text-[9px] text-gray-400 font-mono block">
              Powered by <strong className="text-white">Nexora One</strong>
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowLegalNotice(!showLegalNotice)}
          className="text-xs bg-white/10 hover:bg-white/20 border border-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1 text-amber-400 font-bold"
        >
          <ShieldAlert className="w-3.5 h-3.5" /> Legal
        </button>
      </header>

      {/* Legal Disclaimer Drawer / Modal */}
      {showLegalNotice && (
        <div className="bg-amber-950/90 border-b border-amber-500/40 p-4 text-xs text-amber-200 space-y-2 animate-fadeIn z-30">
          <div className="flex items-center justify-between font-bold text-white uppercase text-[11px]">
            <span className="flex items-center gap-1.5 text-amber-400">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> Aviso Legal y Deslinde de Responsabilidad (Nexora One / Prensa NexoraOne • Cadena 4)
            </span>
            <button onClick={() => setShowLegalNotice(false)}><X className="w-4 h-4" /></button>
          </div>
          <p className="leading-relaxed">
            <strong>Nexora One</strong> y <strong>Prensa NexoraOne • Cadena 4</strong> actúan únicamente como soporte tecnológico de recepción. Los reportes o archivos enviados de forma anónima o sin datos de identidad comprobables carecen de presunción de veracidad inmediata, no poseen la misma carga de objetividad ni prioridad de publicación que las coberturas de corresponsales acreditados, y serán sometidos a estricta verificación periodística previa. El emisor asume total responsabilidad legal por la veracidad del material enviado.
          </p>
        </div>
      )}

      {/* Main Reporting Area */}
      <main className="flex-grow flex flex-col p-4 max-w-xl mx-auto w-full space-y-4">
        
        {/* Mode Selector (Acreditado vs Periodista Ciudadano Anónimo) */}
        <div className="bg-[#111625] border border-white/10 p-1.5 rounded-xl flex gap-1">
          <button
            onClick={() => setReportMode("anonimo")}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              reportMode === "anonimo"
                ? "bg-emerald-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <UserX className="w-4 h-4" /> Reporte Anónimo (Vecino)
          </button>

          <button
            onClick={() => {
              setReportMode("acreditado");
              if (isLocked) setShowSettings(true);
            }}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              reportMode === "acreditado"
                ? "bg-red-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <UserCheck className="w-4 h-4" /> Prensa / Acreditado
          </button>
        </div>

        {/* Location & Status Card */}
        <div className="bg-[#111625] border border-white/10 p-3 rounded-xl flex items-center justify-between text-xs text-white/70">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="text-red-500 w-4 h-4 shrink-0 animate-bounce" />
            <span className="truncate">{locationLabel}</span>
          </div>
          <button 
            onClick={detectLocation}
            className="text-red-400 hover:text-red-300 font-bold ml-2 shrink-0 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> GPS
          </button>
        </div>

        {/* PIN Unlock Modal for Acredited journalists */}
        {showSettings && (
          <div className="bg-[#111625] border border-red-500/40 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase">Acceso Prensa Acreditado</h3>
            <input
              type="text"
              value={corresponsalName}
              onChange={(e) => setCorresponsalName(e.target.value)}
              placeholder="Tu Nombre Periodístico"
              className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white"
            />
            <input
              type="password"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              placeholder="PIN de Prensa (1234)"
              className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white"
            />
            <button
              onClick={handleUnlock}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg text-xs"
            >
              Confirmar Acceso Acreditado
            </button>
          </div>
        )}

        {/* Reporting Controls Card */}
        <div className="space-y-4 bg-[#111625]/80 border border-white/10 p-4 rounded-2xl">
          
          {/* Mode Info Badge */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-300 flex items-center gap-1">
              {reportMode === "anonimo" ? (
                <> <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Modo: Periodista Ciudadano Anónimo </>
              ) : (
                <> <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> Modo: Corresponsal Acreditado ({corresponsalName || "Prensa"}) </>
              )}
            </span>
          </div>

          {/* Text input */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-400 flex justify-between">
              <span>Suceso / Novedad en la Vía Pública</span>
              <span className="text-white/40">{inputText.length} caracteres</span>
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                reportMode === "anonimo"
                  ? "Describe lo que ves o lo que está sucediendo en tu barrio/calle..."
                  : "Borrador de la noticia redactado por el corresponsal..."
              }
              rows={4}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 text-white placeholder:text-gray-500 resize-none"
            />
          </div>

          {/* Opciones de Configuración Editorial (Duración Video & Copete) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/40 p-3 rounded-xl border border-white/10 text-xs">
            {/* Duración del Video Editable */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                ⏱️ Duración Máxima de Video
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMaxVideoDuration(60);
                    setVideoSecondsLeft(60);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] border transition-all ${
                    maxVideoDuration === 60
                      ? 'bg-purple-600 text-white border-purple-400 font-extrabold shadow'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                  }`}
                >
                  ⚡ 60 Segundos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMaxVideoDuration(180);
                    setVideoSecondsLeft(180);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] border transition-all ${
                    maxVideoDuration === 180
                      ? 'bg-purple-600 text-white border-purple-400 font-extrabold shadow'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                  }`}
                >
                  📽️ 180s (3 min)
                </button>
              </div>
            </div>

            {/* Incluir Copete Periodístico */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                📝 Copete Periodístico
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setIncludeCopete(true)}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] border transition-all ${
                    includeCopete
                      ? 'bg-emerald-600 text-white border-emerald-400 font-extrabold shadow'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                  }`}
                >
                  🟢 Sí (Con Copete)
                </button>
                <button
                  type="button"
                  onClick={() => setIncludeCopete(false)}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] border transition-all ${
                    !includeCopete
                      ? 'bg-amber-600 text-white border-amber-400 font-extrabold shadow'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                  }`}
                >
                  ⚪ No (Sin Copete)
                </button>
              </div>
            </div>
          </div>

          {/* Media Attachment Actions (Foto, Audio, Filmar Video, Subir Video) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Image attachment */}
            <div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-3 px-3 rounded-xl border border-white/10 flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  attachedImagePreview
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-white/5 hover:bg-white/10 text-gray-300"
                }`}
              >
                <Camera className="w-4 h-4 text-amber-400" />
                {attachedImage ? "Foto Adjunta" : "Tomar/Subir Foto"}
              </button>
            </div>

            {/* Audio Record */}
            <div>
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-full py-3 px-3 rounded-xl bg-red-600 text-white flex items-center justify-center gap-2 text-xs font-bold animate-pulse"
                >
                  <Square className="w-4 h-4" /> Detener ({formatTime(recordingTime)})
                </button>
              ) : recordedAudio ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={discardAudio}
                    className="p-3 bg-red-950/60 border border-red-500/40 text-red-400 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex-1 py-2 px-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-xl text-[11px] font-bold truncate text-center">
                    Audio Grabado ({formatTime(recordingTime)})
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-full py-3 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 flex items-center justify-center gap-2 text-xs font-bold"
                >
                  <Mic className="w-4 h-4 text-red-400" /> Grabar Audio
                </button>
              )}
            </div>

            {/* Video Record (60s max) */}
            <div>
              {isVideoRecording ? (
                <button
                  type="button"
                  onClick={stopVideoRecording}
                  className="w-full py-3 px-3 rounded-xl bg-red-600 text-white flex items-center justify-center gap-2 text-xs font-bold animate-pulse"
                >
                  <Square className="w-4 h-4" /> 🔴 Filmando ({videoSecondsLeft}s)
                </button>
              ) : recordedVideoUrl ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={discardVideo}
                    className="p-3 bg-red-950/60 border border-red-500/40 text-red-400 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex-1 py-2 px-3 bg-red-950/60 border border-red-500/40 text-red-300 rounded-xl text-[11px] font-bold truncate text-center">
                    Video Filmado ({maxVideoDuration}s)
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startVideoRecording}
                  className="w-full py-3 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center gap-2 text-xs font-bold"
                >
                  <Video className="w-4 h-4 text-red-500" /> Filmar Video ({maxVideoDuration}s)
                </button>
              )}
            </div>

            {/* Video File Upload */}
            <div>
              <input
                type="file"
                accept="video/*"
                ref={videoFileInputRef}
                onChange={handleVideoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => videoFileInputRef.current?.click()}
                className={`w-full py-3 px-3 rounded-xl border border-white/10 flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  attachedVideoPreview
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                    : "bg-white/5 hover:bg-white/10 text-gray-300"
                }`}
              >
                <Video className="w-4 h-4 text-purple-400" />
                {attachedVideo ? "Video Adjunto" : `Subir Video (${maxVideoDuration}s)`}
              </button>
            </div>
          </div>

          {/* Image Preview */}
          {attachedImagePreview && (
            <div className="relative rounded-xl overflow-hidden border border-amber-500/40 max-h-48">
              <img src={attachedImagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                onClick={() => {
                  setAttachedImage(null);
                  setAttachedImagePreview(null);
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-full text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Video Preview */}
          {(attachedVideoPreview || recordedVideoUrl) && (
            <div className="relative rounded-xl overflow-hidden border border-red-500/40 bg-black max-h-48 aspect-video">
              <video
                src={attachedVideoPreview || recordedVideoUrl || undefined}
                controls
                className="w-full h-full object-contain"
              />
              <button
                onClick={discardVideo}
                className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-full text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Legal Disclaimer Brief Footer */}
          <div className="bg-black/40 border border-white/5 p-2.5 rounded-xl text-[10px] text-gray-400 leading-snug">
            <span className="text-amber-400 font-bold">Deslinde Legal:</span> Nexora One y Prensa NexoraOne • Cadena 4 actúan únicamente como plataforma de recepción. Los reportes anónimos serán sometidos a verificación previa.
          </div>

          {/* Success Message */}
          {successMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold text-center">
              {successMsg}
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSubmitReport}
            disabled={loading}
            className={`w-full font-extrabold py-3.5 px-6 rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider ${
              reportMode === "anonimo"
                ? "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white"
                : "bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white"
            } disabled:opacity-50`}
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" /> Enviar Reporte a Estudio Nexativa
              </>
            )}
          </button>
        </div>

        {/* History of Sent Reports */}
        {sentReports.length > 0 && (
          <div className="bg-[#111625] border border-white/10 p-4 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase">Tus Envíos Recientes</h4>
            <div className="space-y-1.5">
              {sentReports.map((rep) => (
                <div key={rep.id} className="flex items-center justify-between text-xs bg-white/5 p-2 rounded-lg">
                  <span className="text-white truncate font-medium max-w-[200px]">{rep.title}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{rep.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Camera Viewfinder Modal */}
        {showVideoModal && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4">
            {/* Top Control Bar */}
            <div className="flex items-center justify-between z-20 bg-black/60 p-3 rounded-xl backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
                <span className="text-white text-xs font-bold uppercase tracking-wider">
                  🔴 FILMANDO ({videoSecondsLeft}s)
                </span>
              </div>

              {/* Flip Camera Button */}
              <button
                type="button"
                onClick={toggleCameraDirection}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {cameraFacingMode === "environment" ? "Cámara Trasera" : "Cámara Selfie"}
              </button>
            </div>

            {/* Viewfinder Video Stream (Real-Time Live Feed) */}
            <div className="absolute inset-0 w-full h-full bg-black">
              <video
                ref={liveVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {/* Bottom Stop Recording Action */}
            <div className="z-20 flex items-center justify-center gap-4 pb-8">
              <button
                type="button"
                onClick={stopVideoRecording}
                className="px-6 py-4 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-2xl shadow-2xl flex items-center gap-2 tracking-wider uppercase border border-red-400/40 animate-pulse active:scale-95"
              >
                <Square className="w-4 h-4 fill-white" /> FINALIZAR Y GUARDAR VIDEO (60s)
              </button>
            </div>
          </div>
        )}

        {/* Footer Credit Signature */}
        <footer className="text-center py-4 text-[10px] text-gray-500 space-y-1">
          <div>Desarrollado por <strong>Nexora One</strong> para Prensa NexoraOne • Cadena 4</div>
          <div>© Todos los derechos reservados</div>
        </footer>
      </main>
    </div>
  );
}

