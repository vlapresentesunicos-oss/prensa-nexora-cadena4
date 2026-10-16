"use client";

import React, { useState, useEffect } from "react";
import { 
  askNoraEditor, 
  askNoraCM, 
  askNoraSupport, 
  askNoraMarketing,
  fetchBrandGuidelines,
  saveBrandGuidelines
} from "@/app/admin/actions/nora";
import { Sparkles, PenTool, Share2, Copy, Check, Loader2, Wand2, Send, Lightbulb, BrainCircuit } from "lucide-react";

interface NoraAssistantProps {
  title: string;
  content: string;
  operatorName?: string;
  roleDescription?: string;
  onApplyChanges?: (newTitle: string, newContent: string, imagePrompt?: string) => void;
  onPublishDirectly?: (newTitle: string, newContent: string) => void;
}

export default function NoraAssistant({ 
  title, 
  content, 
  operatorName = "Compañero",
  roleDescription = "Editora, CM y Asesora",
  onApplyChanges,
  onPublishDirectly 
}: NoraAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [responseHtml, setResponseHtml] = useState<string | null>(null);
  
  // State to hold the new generated content so we can apply it
  const [generatedData, setGeneratedData] = useState<{newTitle: string, newContent: string, imagePrompt?: string} | null>(null);
  
  const [copied, setCopied] = useState(false);
  const [activeMode, setActiveMode] = useState<"editora" | "cm" | "soporte" | "publicista" | "entrenamiento" | null>(null);
  const [guidelinesText, setGuidelinesText] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const text = await fetchBrandGuidelines();
        setGuidelinesText(text);
      } catch (e) {
        console.error("Error loading brand guidelines:", e);
      }
    }
    load();
  }, []);

  const handleSaveGuidelines = async () => {
    setLoading(true);
    try {
      const ok = await saveBrandGuidelines(guidelinesText);
      if (ok) {
        alert("¡Memoria de Nora entrenada con éxito! 🧠");
        setActiveMode(null);
      } else {
        alert("No se pudo guardar la memoria.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAskEditor = async () => {
    setLoading(true);
    setActiveMode("editora");
    setResponseHtml(null);
    setGeneratedData(null);
    
    const res = await askNoraEditor(title || "", content || "", operatorName);
    if (res.success) {
      if (res.newTitle && res.newContent) {
        setGeneratedData({ newTitle: res.newTitle, newContent: res.newContent });
        // Mostrar el mensaje amigable de Nora, y luego el texto limpio para copiar
        setResponseHtml(`
          ${res.text}
          <div class="mt-4 p-4 bg-black/40 border border-white/10 rounded-lg">
            <h4 class="text-sm font-bold text-white/50 uppercase mb-2">Texto Limpio para Copiar:</h4>
            <p class="font-bold text-lg mb-2">${res.newTitle}</p>
            <div class="text-gray-200 whitespace-pre-wrap">${res.newContent}</div>
          </div>
        `);
      } else {
        setResponseHtml(res.text || "");
      }
    } else {
      setResponseHtml(`<p class="text-red-400">${res.error}</p>`);
    }
    setLoading(false);
  };

  const handleAskCM = async () => {
    setLoading(true);
    setActiveMode("cm");
    setResponseHtml(null);
    setGeneratedData(null);
    
    const res = await askNoraCM(title || "", content || "", operatorName);
    if (res.success) {
      setResponseHtml(res.text || "");
    } else {
      setResponseHtml(`<p class="text-red-400">${res.error}</p>`);
    }
    setLoading(false);
  };

  const handleAskMarketing = async () => {
    setLoading(true);
    setActiveMode("publicista");
    setResponseHtml(null);
    setGeneratedData(null);
    
    const res = await askNoraMarketing(title || "", content || "", operatorName);
    if (res.success) {
      if (res.newTitle && res.newContent) {
        setGeneratedData({ newTitle: res.newTitle, newContent: res.newContent, imagePrompt: res.imagePrompt });
        setResponseHtml(`
          ${res.text}
          <div class="mt-6 p-4 bg-black/40 border border-white/10 rounded-lg font-sans">
            <h4 class="text-sm font-bold text-white/50 uppercase mb-2">Copy Limpio para Redes Sociales:</h4>
            <p class="font-bold text-lg mb-2 text-white">${res.newTitle}</p>
            <div class="text-gray-200 whitespace-pre-wrap text-xs leading-relaxed">${res.newContent}</div>
            ${res.imagePrompt ? `<div class='mt-3 pt-3 border-t border-white/5 text-[11px] text-purple-300 font-bold'>✨ Prompt Visual de IA generado para esta campaña.</div>` : ""}
          </div>
        `);
      } else {
        setResponseHtml(res.text || "");
      }
    } else {
      setResponseHtml(`<p class="text-red-400">${res.error}</p>`);
    }
    setLoading(false);
  };

  const handleAskSupport = async () => {
    const query = (document.getElementById("soporte-query") as HTMLTextAreaElement)?.value;
    if (!query) return;
    setLoading(true);
    setResponseHtml(null);
    setGeneratedData(null);
    
    const res = await askNoraSupport(query, operatorName);
    if (res.success) setResponseHtml(res.text || "");
    else setResponseHtml(`<p class="text-red-400">${res.error}</p>`);
    setLoading(false);
  };

  const copyToClipboard = () => {
    if (!responseHtml) return;
    // For CM it's just raw HTML, for Editor it's the HTML panel text
    // But if we want to copy the actual content, we should copy the generatedData content if it exists
    const textToCopy = generatedData ? generatedData.newContent.replace(/<[^>]+>/g, "") : responseHtml.replace(/<[^>]+>/g, "");
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-purple-500/30 rounded-xl p-5 shadow-[0_0_15px_rgba(168,85,247,0.15)] relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full pointer-events-none"></div>
      
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="bg-purple-500/20 p-2 rounded-lg">
          <Sparkles className="text-purple-400 w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-white">Nora IA <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full ml-2">Nexativa Brain</span></h3>
          <p className="text-xs text-purple-200">Editora, CM y Asesora</p>
        </div>
      </div>

      {activeMode === "entrenamiento" ? (
        <div className="mb-4 relative z-10 space-y-3">
          <p className="text-[11px] text-purple-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <BrainCircuit className="w-4 h-4 text-purple-400 shrink-0 animate-pulse" />
            Entrenamiento de Nora: Memoria de Marca
          </p>
          <p className="text-[10px] text-white/50 leading-relaxed font-sans">
            Escribe el tono de voz deseado, ideas clave de campañas pasadas, reglas locales o directrices comerciales. Nora leerá esto en cada consulta para alinearse a tus necesidades.
          </p>
          <textarea
            placeholder="Ej: Somos un portal en Corrientes. Usamos humor local respetuoso, tono argentino pero formal. Queremos promocionar las ofertas locales..."
            className="w-full bg-black/40 border border-purple-500/30 focus:border-purple-500 rounded-lg p-3 text-xs text-white outline-none"
            rows={5}
            value={guidelinesText}
            onChange={(e) => setGuidelinesText(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveGuidelines}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Guardar Memoria"}
            </button>
            <button
              onClick={() => { setActiveMode(null); }}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : activeMode === "soporte" ? (
        <div className="mb-4 relative z-10">
          <textarea
            placeholder={`¿En qué puedo ayudarte, ${operatorName}? Escribe tu consulta...`}
            className="w-full bg-black/40 border border-purple-500/30 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 mb-2"
            rows={3}
            id="soporte-query"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAskSupport}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Preguntar"}
            </button>
            <button
              onClick={() => { setActiveMode(null); setResponseHtml(null); }}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-1">
            <button
              onClick={handleAskEditor}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-black/40 hover:bg-purple-600/30 border border-purple-500/30 text-white py-2 px-2 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              title="Mejorar Redacción y SEO"
            >
              {loading && activeMode === "editora" ? (
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              ) : (
                <PenTool className="w-4 h-4 text-purple-400 group-hover:text-white transition-colors" />
              )}
              <span className="font-medium text-xs">Editora</span>
            </button>

            <button
              onClick={handleAskMarketing}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-black/40 hover:bg-amber-600/30 border border-amber-500/30 text-white py-2 px-2 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              title="Estrategias, Guiones y Ads"
            >
              {loading && activeMode === "publicista" ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <Lightbulb className="w-4 h-4 text-amber-400 group-hover:text-white transition-colors" />
              )}
              <span className="font-medium text-xs">Estratega</span>
            </button>

            <button
              onClick={handleAskCM}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-black/40 hover:bg-pink-600/30 border border-pink-500/30 text-white py-2 px-2 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              title="Generar Copys Virales"
            >
              {loading && activeMode === "cm" ? (
                <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
              ) : (
                <Share2 className="w-4 h-4 text-pink-400 group-hover:text-white transition-colors" />
              )}
              <span className="font-medium text-xs">CM Redes</span>
            </button>

            <button
              onClick={() => { setActiveMode("soporte"); setResponseHtml(null); }}
              className="flex items-center justify-center gap-2 bg-black/40 hover:bg-blue-600/30 border border-blue-500/30 text-white py-2 px-2 rounded-lg transition-all duration-300 group cursor-pointer"
              title="Soporte Técnico"
            >
              <Sparkles className="w-4 h-4 text-blue-400 group-hover:text-white transition-colors" />
              <span className="font-medium text-xs">Soporte</span>
            </button>
          </div>

          {/* Button to Train Nora */}
          <button
            onClick={() => { setActiveMode("entrenamiento"); setResponseHtml(null); }}
            className="flex items-center justify-center gap-2 w-full bg-black/40 hover:bg-purple-600/25 border border-purple-500/35 hover:border-purple-500/50 text-white py-2 px-3 rounded-lg transition-all duration-300 group cursor-pointer"
            title="Entrenar a Nora con tus directrices"
          >
            <BrainCircuit className="w-4 h-4 text-purple-400 group-hover:animate-pulse transition-transform" />
            <span className="font-bold text-[10px] uppercase tracking-wider text-purple-200">🧠 Entrenar a Nora (Memoria)</span>
          </button>
        </div>
      )}

      {responseHtml && (
        <div className="mt-4 bg-black/60 border border-white/10 rounded-lg p-4 relative group z-10">
          <button 
            onClick={copyToClipboard}
            className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 p-2 rounded transition-colors z-20"
            title="Copiar al portapapeles"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-300" />}
          </button>
          
          <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2 pr-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0"></span>
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Nora ({activeMode})
            </span>
          </div>
          
          {/* Prose classes para estilizar el HTML inyectado de forma segura */}
          <div 
            className="text-gray-200 text-sm prose prose-invert max-w-none prose-p:leading-relaxed prose-p:mb-2 prose-strong:text-white prose-ul:pl-4 prose-ul:mb-2 mb-4"
            dangerouslySetInnerHTML={{ __html: responseHtml }}
          />

          {/* Acciones de Autopublicación (Solo en modo Editora o Publicista si se generó data) */}
          {(activeMode === "editora" || activeMode === "publicista") && generatedData && (
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-purple-300 font-medium mb-1 text-center">¿Qué hacemos con esta sugerencia, {operatorName}?</p>
              
              {onApplyChanges && (
                <button 
                  onClick={() => onApplyChanges(generatedData.newTitle, generatedData.newContent, generatedData.imagePrompt)}
                  className="flex items-center justify-center gap-2 w-full bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer"
                >
                  <Wand2 className="w-4 h-4 text-purple-300" />
                  Aplicar cambios al Borrador
                </button>
              )}
              
              {onPublishDirectly && (
                <button 
                  onClick={() => onPublishDirectly(generatedData.newTitle, generatedData.newContent)}
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  ¡Publicar Ahora Mismo!
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

