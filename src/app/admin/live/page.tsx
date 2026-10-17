"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle, 
  Mic, 
  Square, 
  MapPin, 
  Camera, 
  Video, 
  Globe, 
  Languages, 
  Copy, 
  Check, 
  Edit3, 
  Eye, 
  Sparkles,
  RefreshCw,
  FileText,
  Upload
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { getClosestLocation } from "@/lib/location-db";

export default function NoraLiveEditor() {
  const [draft, setDraft] = useState<string>("");
  const [messages, setMessages] = useState<{role: 'user'|'nora', text: string}[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>("auto");
  const [detectedLangBadge, setDetectedLangBadge] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  // Video recording state (up to 60s)
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoMediaRecorder, setVideoMediaRecorder] = useState<MediaRecorder | null>(null);
  const [videoSecondsLeft, setVideoSecondsLeft] = useState(60);
  const videoTimerRef = useRef<any>(null);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");
  const [isSubmittingToQueue, setIsSubmittingToQueue] = useState(false);

  // Mobile layout state: tab switcher ('chat' | 'draft')
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'draft'>('chat');
  const [isEditingDraftDirectly, setIsEditingDraftDirectly] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoords(`${lat}, ${lng}`);
          
          const loc = getClosestLocation(lat, lng);
          if (loc) {
            setLocationName(loc.name);
          } else {
            setLocationName("Ituzaingó, Corrientes");
          }
        },
        (error) => {
          console.warn("Error de geolocalización:", error);
          setCoords("-27.5973, -56.6874");
          setLocationName("Centro (Ituzaingó)");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setCoords("-27.5973, -56.6874");
      setLocationName("Centro (Ituzaingó)");
    }
  }, []);

  const uploadFileDirectToStorage = async (file: File | Blob, folderName: string): Promise<string | null> => {
    try {
      const isAudio = folderName.includes("audio") || file.type.includes("audio");
      const isVideo = folderName.includes("video") || file.type.includes("video");
      const defaultExt = isAudio ? "webm" : isVideo ? "webm" : "jpg";
      const fileName = file instanceof File ? file.name : `${isAudio ? "audio" : isVideo ? "video" : "image"}_${Date.now()}.${defaultExt}`;
      const ext = fileName.split(".").pop() || defaultExt;
      const path = `${folderName}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const fileType = file.type || (ext === "webm" ? (isAudio ? "audio/webm" : "video/webm") : ext === "mp4" ? "video/mp4" : "image/jpeg");

      // 1. Direct upload using client
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
        console.warn("Aviso de subida, usando método alternativo:", uploadErr.message);
      }

      // 2. Fallback: Signed Upload URL API
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
      console.error("Direct upload error in Nora Live:", err);
      return null;
    }
  };

  const postToNoraLive = async (payload: any) => {
    const res = await fetch("/api/nora-live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    let resData: any = {};
    const text = await res.text();
    try {
      resData = JSON.parse(text);
    } catch (e) {
      console.error("Non-JSON response from /api/nora-live:", text);
      if (res.status === 413) {
        throw new Error("El archivo adjunto es demasiado grande para enviarlo directamente.");
      }
      throw new Error(`Error en el servidor (${res.status}): ${text.substring(0, 100)}`);
    }

    if (!res.ok || resData.error) {
      throw new Error(resData.reply || resData.error || "Error de respuesta del endpoint.");
    }
    return resData;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsProcessing(true);

    try {
      const data = await postToNoraLive({ message: userMsg, currentDraft: draft, interview_language: selectedLang });
      if (data.newDraft) {
        setDraft(data.newDraft);
        if (data.detectedLanguage && data.detectedLanguage !== 'spanish') {
          setDetectedLangBadge(data.detectedLanguage);
        }
      }
      setMessages(prev => [...prev, { role: 'nora', text: data.reply || "Borrador actualizado." }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'nora', text: `Hubo un error de conexión (${e.message || e}).` }]);
    }
    setIsProcessing(false);
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        setMessages(prev => [...prev, { role: 'user', text: "[Reporte de voz enviado]" }]);
        setIsProcessing(true);

        try {
          let audioUrl = await uploadFileDirectToStorage(audioBlob, "corresponsales_audio");
          let payload: any = {
            message: input.trim() ? `El periodista adjuntó un reporte de voz. Contexto adicional: ${input.trim()}` : "El periodista adjuntó un reporte de voz desde el lugar de los hechos. Transcríbelo e intégralo a la noticia.",
            currentDraft: draft,
            interview_language: selectedLang
          };

          if (audioUrl) {
            payload.audio_url = audioUrl;
          } else {
            const reader = new FileReader();
            const base64Audio = await new Promise<string>((res) => {
              reader.onloadend = () => res(reader.result as string);
              reader.readAsDataURL(audioBlob);
            });
            payload.audio = base64Audio;
          }

          const data = await postToNoraLive(payload);
          if (data.newDraft) {
            setDraft(data.newDraft);
          }
          setMessages(prev => [...prev, { role: 'nora', text: data.reply || "Borrador actualizado con el reporte de voz." }]);
          setInput("");
        } catch (e: any) {
          console.error(e);
          const details = e.message || "Fallo de conexión o de red";
          setMessages(prev => [...prev, { role: 'nora', text: `Hubo un error al procesar el reporte de voz (${details}).` }]);
        } finally {
          setIsProcessing(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err: any) {
      console.error(err);
      alert("No se pudo acceder al micrófono: " + (err.message || err));
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setPendingImage(file);
    setMessages(prev => [...prev, { role: 'user', text: `[Imagen adjunta: ${file.name}]` }]);
    setIsProcessing(true);

    try {
      let imageUrl = await uploadFileDirectToStorage(file, "corresponsales");
      let payload: any = {
        message: input.trim() ? `El periodista adjuntó una imagen. Contexto adicional: ${input.trim()}` : "El periodista adjuntó una imagen desde el lugar de los hechos. Descríbela e intégrala a la noticia.", 
        currentDraft: draft,
        interview_language: selectedLang
      };

      if (imageUrl) {
        payload.image_url = imageUrl;
      } else {
        const base64Image = await resizeImage(file);
        payload.image = base64Image;
      }

      const data = await postToNoraLive(payload);
      if (data.newDraft) {
        setDraft(data.newDraft);
      }
      setMessages(prev => [...prev, { role: 'nora', text: data.reply || "Borrador actualizado con la información de la imagen." }]);
      setInput("");
    } catch (e: any) {
      console.error(e);
      const details = e.message || "Fallo de conexión o de red";
      setMessages(prev => [...prev, { role: 'nora', text: `Hubo un error de conexión al enviar la imagen (${details}).` }]);
    }
    setIsProcessing(false);
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        if (videoTimerRef.current) clearInterval(videoTimerRef.current);
        stream.getTracks().forEach(track => track.stop());

        setMessages(prev => [...prev, { role: 'user', text: "[Filmación de video (hasta 60s) enviada por el operador]" }]);
        setIsProcessing(true);

        try {
          const videoBlob = new Blob(chunks, { type: 'video/webm' });
          let videoUrl = await uploadFileDirectToStorage(videoBlob, "corresponsales_video");
          let payload: any = {
            message: input.trim() ? `El operador filmó un video en el lugar del hecho. Contexto adicional: ${input.trim()}` : "El operador filmó un video de hasta 60 segundos desde el lugar del hecho o siniestro. Analízalo e intégralo a la noticia.",
            currentDraft: draft,
            interview_language: selectedLang
          };

          if (videoUrl) {
            payload.video_url = videoUrl;
          } else {
            const reader = new FileReader();
            const base64Video = await new Promise<string>((res) => {
              reader.onloadend = () => res(reader.result as string);
              reader.readAsDataURL(videoBlob);
            });
            payload.video = base64Video;
          }

          const data = await postToNoraLive(payload);
          if (data.newDraft) {
            setDraft(data.newDraft);
          }
          setMessages(prev => [...prev, { role: 'nora', text: data.reply || "Borrador actualizado con la filmación de video." }]);
          setInput("");
        } catch (e: any) {
          console.error(e);
          const details = e.message || "Fallo de conexión";
          setMessages(prev => [...prev, { role: 'nora', text: `Hubo un error al procesar el video (${details}).` }]);
        } finally {
          setIsProcessing(false);
          setIsVideoRecording(false);
          setVideoSecondsLeft(60);
        }
      };

      recorder.start();
      setVideoMediaRecorder(recorder);
      setIsVideoRecording(true);
      setVideoSecondsLeft(60);

      videoTimerRef.current = setInterval(() => {
        setVideoSecondsLeft(prev => {
          if (prev <= 1) {
            if (recorder.state !== "inactive") recorder.stop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error(err);
      alert("No se pudo acceder a la cámara o micrófono: " + (err.message || err));
    }
  };

  const stopVideoRecording = () => {
    if (videoMediaRecorder && isVideoRecording) {
      videoMediaRecorder.stop();
      setIsVideoRecording(false);
    }
  };

  const handleVideoUpload = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      alert("El video supera los 100MB. Sube una filmación de hasta 5 minutos.");
      return;
    }

    setMessages(prev => [...prev, { role: 'user', text: `[Video adjunto: ${file.name}]` }]);
    setIsProcessing(true);

    try {
      let videoUrl = await uploadFileDirectToStorage(file, "corresponsales_video");
      let payload: any = {
        message: input.trim() ? `El operador adjuntó un video. Contexto adicional: ${input.trim()}` : "El operador subió una filmación de video desde el lugar del siniestro. Analízala e intégrala a la noticia.",
        currentDraft: draft,
        interview_language: selectedLang
      };

      if (videoUrl) {
        payload.video_url = videoUrl;
      } else {
        const reader = new FileReader();
        const base64Video = await new Promise<string>((res) => {
          reader.onloadend = () => res(reader.result as string);
          reader.readAsDataURL(file);
        });
        payload.video = base64Video;
      }

      const data = await postToNoraLive(payload);
      if (data.newDraft) {
        setDraft(data.newDraft);
      }
      setMessages(prev => [...prev, { role: 'nora', text: data.reply || "Borrador actualizado con el video adjunto." }]);
      setInput("");
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'nora', text: `Error de conexión al enviar el video: ${e.message || e}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitToQueue = async () => {
    if (!draft.trim()) return;
    setIsSubmittingToQueue(true);
    try {
      let imageUrl = null;
      if (pendingImage) {
        const fileExt = pendingImage.name.split('.').pop();
        const filePath = `articles/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, pendingImage);
        if (uploadError) {
          console.warn("Error subiendo imagen en cola:", uploadError.message);
        } else {
          const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      const operatorId = userData?.user?.id || "a8b297ea-5d91-402c-91d4-88ca6e2f19f3";

      const bodyFormData = new FormData();
      bodyFormData.append("operator_id", operatorId);
      bodyFormData.append("geolocation_coordinates", coords || "-27.5973, -56.6874");
      bodyFormData.append("raw_metadata_title", "Borrador de Nora Live: " + draft.replace(/<[^>]*>/g, '').substring(0, 30));
      bodyFormData.append("timestamp_utc", new Date().toISOString());
      bodyFormData.append("draft_text", draft);
      
      if (imageUrl) {
        bodyFormData.append("attached_media_url", JSON.stringify([imageUrl]));
      }

      const res = await fetch("/api/corresponsal", {
        method: "POST",
        body: bodyFormData
      });

      const resData = await res.json();
      
      if (res.ok && resData.success) {
        setPublished(true);
        setMessages(prev => [...prev, { role: 'nora', text: "¡Reporte enviado exitosamente a la cola de revisión de corresponsalía!" }]);
      } else {
        throw new Error(resData.error || "Error de respuesta del endpoint.");
      }
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'nora', text: `Error al enviar a la cola: ${e.message || e}` }]);
    } finally {
      setIsSubmittingToQueue(false);
    }
  };

  const handlePublish = async () => {
    if (!draft.trim()) return;
    setIsPublishing(true);
    try {
      let imageUrl = null;
      if (pendingImage) {
        const fileExt = pendingImage.name.split('.').pop();
        const filePath = `articles/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, pendingImage);
        if (uploadError) {
          setMessages(prev => [...prev, { role: 'nora', text: `Advertencia: No se pudo subir la imagen al almacenamiento (${uploadError.message}). Intentando publicar sin imagen...` }]);
        } else {
          const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      const authorId = userData?.user?.id || null;

      const plainTitle = draft.replace(/<[^>]*>/g, '').split('\n')[0].substring(0, 80) || "🔴 Noticia en Desarrollo";

      const { error } = await supabase.from("articles").insert({
        title: plainTitle,
        excerpt: draft.replace(/<[^>]*>/g, '').substring(0, 150) + "...",
        content: draft + "<br><br><strong>🔴 Noticia en Desarrollo - Cadena 4 Actualizada hace instantes</strong>",
        status: "published",
        category: "local",
        image_url: imageUrl,
        author_id: authorId
      });

      if (error) {
        setMessages(prev => [...prev, { role: 'nora', text: `Error de base de datos al publicar la noticia: ${error.message} (Código: ${error.code || 'Desconocido'})` }]);
      } else {
        setPublished(true);
        setMessages(prev => [...prev, { role: 'nora', text: "¡Noticia publicada con éxito en Cadena 4!" }]);
      }
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'nora', text: `Excepción durante la publicación: ${e.message || e}` }]);
    }
    setIsPublishing(false);
  };

  const handleCopyDraft = () => {
    const plainText = draft.replace(/<[^>]*>/g, '');
    navigator.clipboard.writeText(plainText);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-3 min-h-[calc(100vh-140px)] md:h-[calc(100vh-120px)]">
      
      {/* Geolocation Visual Indicator & Mobile Status Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-slate-900/60 border border-white/10 p-3 rounded-2xl">
        <div className="flex items-center gap-2 text-xs text-amber-300">
          <MapPin className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
          <span className="truncate">
            <strong>Ubicación de Cobertura:</strong> {locationName || "Ituzaingó, Corrientes"}
            {coords && <span className="text-white/40 ml-1 font-mono text-[10px]">({coords})</span>}
          </span>
        </div>

        {detectedLangBadge && (
          <div className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between gap-2 text-[11px] text-blue-300">
            <span className="flex items-center gap-1.5 truncate">
              <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Interpretado desde: <strong>{detectedLangBadge}</strong></span>
            </span>
            <button onClick={() => setDetectedLangBadge(null)} className="text-white/40 hover:text-white ml-1">✕</button>
          </div>
        )}
      </div>

      {/* Mobile Segmented Control (Pestañas Móviles para no cortar la vista) */}
      <div className="md:hidden flex items-center bg-slate-950 p-1.5 rounded-2xl border border-white/10 shadow-lg sticky top-0 z-20">
        <button
          type="button"
          onClick={() => setActiveMobileTab('chat')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            activeMobileTab === 'chat'
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Chat con Nora</span>
          {messages.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
              {messages.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveMobileTab('draft')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            activeMobileTab === 'draft'
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>Borrador en Vivo</span>
          {draft.trim() && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30 font-bold">
              ✓
            </span>
          )}
        </button>
      </div>

      {/* Main Dual Workstation Container */}
      <div className="flex flex-col md:flex-row gap-4 flex-1 md:overflow-hidden">
        
        {/* PANEL 1: CHAT CON NORA (En móvil se muestra según tab activo, en desktop siempre visible) */}
        <div className={`w-full md:w-1/2 flex-col bg-slate-950/80 border border-white/10 rounded-2xl md:overflow-hidden shadow-2xl ${
          activeMobileTab === 'chat' ? 'flex min-h-[500px]' : 'hidden md:flex'
        }`}>
          
          {/* Header del Chat */}
          <div className="bg-gradient-to-r from-orange-500/20 via-red-500/10 to-transparent p-3.5 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center text-white font-black text-sm shadow">
                N1
              </div>
              <div>
                <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>Nora Live Editor</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold">CO-PILOT</span>
                </h2>
                <p className="text-[11px] text-orange-200/80 font-mono">Redactora Jefa • Transmisión Minuto a Minuto</p>
              </div>
            </div>

            {/* Selector de Idioma Compacto */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              {[
                { id: 'auto', label: 'Auto', flag: '🌐' },
                { id: 'pt', label: 'PT', flag: '🇧🇷' },
                { id: 'en', label: 'EN', flag: '🇺🇸' },
                { id: 'es', label: 'ES', flag: '🇦🇷' },
              ].map(lang => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setSelectedLang(lang.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-0.5 ${
                    selectedLang === lang.id
                      ? 'bg-orange-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={`Idioma de entrevista: ${lang.label}`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Área de Mensajes Scrolleable */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 min-h-[280px] max-h-[50vh] md:max-h-none">
            <div className="bg-white/5 border border-white/10 p-3 rounded-2xl max-w-[90%] text-xs text-slate-300 leading-relaxed shadow-sm">
              <p className="font-bold text-orange-400 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Nora lista para redactar
              </p>
              Envíame datos sueltos, fotos, audio de testimonios o videos de hasta 60s. Yo redacto y actualizo el borrador en vivo automáticamente.
            </div>

            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`p-3 rounded-2xl max-w-[88%] text-xs leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white ml-auto font-medium' 
                    : 'bg-slate-900 border border-white/10 text-slate-200 mr-auto'
                }`}
              >
                {msg.text}
              </div>
            ))}

            {isProcessing && (
              <div className="bg-slate-900 border border-white/10 p-3 rounded-2xl max-w-[85%] text-xs text-orange-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                <span>Nora está procesando e integrando al borrador...</span>
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>

          {/* DOCK ERGONÓMICO DE ENTRADA (2 FILAS: 100% RESPONSIVE EN CUALQUIER PANTALLA) */}
          <div className="p-3 border-t border-white/10 bg-slate-950/95 space-y-2 shrink-0">
            
            {/* Fila 1: Campo de Texto y Botón Enviar */}
            <div className="flex items-center gap-2">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Escribe el dato del suceso aquí..."
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-colors"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className="p-2.5 px-4 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl hover:from-orange-400 hover:to-red-500 text-white transition-all disabled:opacity-40 shrink-0 font-bold shadow-md shadow-orange-500/20"
                title="Enviar mensaje a Nora"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Fila 2: Bandeja de Acciones Multimedia (Táctil, sin desbordamiento horizontal) */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              
              {/* Audio Grabador */}
              <button 
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[11px] font-bold border ${
                  isRecording 
                    ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-lg shadow-red-500/30' 
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
                title={isRecording ? "Detener grabación y enviar" : "Grabar reporte de voz"}
              >
                {isRecording ? <Square className="w-3.5 h-3.5 fill-white" /> : <Mic className="w-3.5 h-3.5 text-orange-400" />}
                <span>{isRecording ? "Detener" : "Audio"}</span>
              </button>

              {/* Cámara Instantánea */}
              <label 
                className="flex-1 py-2 px-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-slate-300 cursor-pointer flex items-center justify-center gap-1.5 text-[11px] font-bold"
                title="Tomar foto con la cámara"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Cámara</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </label>

              {/* Galería / Imagen */}
              <label 
                className="flex-1 py-2 px-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-slate-300 cursor-pointer flex items-center justify-center gap-1.5 text-[11px] font-bold"
                title="Adjuntar imagen desde galería"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Foto</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </label>

              {/* Video en Vivo 60s */}
              <button 
                type="button"
                onClick={isVideoRecording ? stopVideoRecording : startVideoRecording}
                className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[11px] font-bold border ${
                  isVideoRecording 
                    ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-lg shadow-red-500/30' 
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
                title={isVideoRecording ? "Detener filmación y enviar" : "Filmar video en vivo (máximo 60 segundos)"}
              >
                <Video className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{isVideoRecording ? `🔴 ${videoSecondsLeft}s` : "Video"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* PANEL 2: BORRADOR EN VIVO (En móvil se muestra según tab activo, en desktop siempre visible) */}
        <div className={`w-full md:w-1/2 flex-col bg-slate-950/80 border border-white/10 rounded-2xl md:overflow-hidden shadow-2xl ${
          activeMobileTab === 'draft' ? 'flex min-h-[500px]' : 'hidden md:flex'
        }`}>
          
          {/* Header del Borrador */}
          <div className="p-3.5 border-b border-white/10 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span>Borrador en Desarrollo</span>
              </h2>

              <div className="flex items-center gap-1">
                {draft && (
                  <button
                    type="button"
                    onClick={handleCopyDraft}
                    className="p-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-colors border border-white/5"
                    title="Copiar texto del borrador"
                  >
                    {copiedDraft ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDraft ? "Copiado" : "Copiar"}</span>
                  </button>
                )}

                {draft && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDraftDirectly(!isEditingDraftDirectly)}
                    className={`p-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors border ${
                      isEditingDraftDirectly
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                    }`}
                    title="Alternar modo edición directa de texto"
                  >
                    {isEditingDraftDirectly ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                    <span>{isEditingDraftDirectly ? "Ver HTML" : "Editar"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Botones de Publicación Inmediata */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSubmitToQueue}
                disabled={!draft.trim() || isPublishing || isSubmittingToQueue || published}
                className="flex-1 sm:flex-none bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                {isSubmittingToQueue ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                <span>A Cola de Revisión</span>
              </button>

              <button 
                onClick={handlePublish}
                disabled={!draft.trim() || isPublishing || isSubmittingToQueue || published}
                className="flex-1 sm:flex-none bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/30 disabled:opacity-40"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publicando...</span>
                  </>
                ) : published ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Publicado</span>
                  </>
                ) : (
                  <span>¡Publicar Ahora!</span>
                )}
              </button>
            </div>
          </div>
          
          {/* Cuerpo del Borrador */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {draft ? (
              isEditingDraftDirectly ? (
                <div className="space-y-2 h-full flex flex-col">
                  <span className="text-[10px] text-orange-400 font-mono font-bold uppercase">
                    Modo Edición Directa del Artículo:
                  </span>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={12}
                    className="w-full flex-1 bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-orange-500/50 leading-relaxed"
                    placeholder="Escribe o edita el cuerpo del artículo..."
                  />
                </div>
              ) : (
                <div 
                  className="prose prose-invert prose-orange max-w-none text-xs sm:text-sm leading-relaxed" 
                  dangerouslySetInnerHTML={{ __html: draft }} 
                />
              )
            ) : (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-slate-500 text-center space-y-2">
                <FileText className="w-10 h-10 text-slate-700" />
                <p className="text-xs font-semibold text-slate-400">El borrador en vivo está vacío aún.</p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Envía testimonios por voz, texto o foto a Nora para comenzar a estructurar la noticia al instante.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveMobileTab('chat')}
                  className="md:hidden mt-2 px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 text-xs font-bold border border-orange-500/30"
                >
                  Abrir Chat con Nora →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
