"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import MediaUploader from "@/components/MediaUploader";
import NoraAssistant from "@/components/NoraAssistant";
import { ArrowLeft, Save, Globe, Share2, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const articleId = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [operatorName, setOperatorName] = useState("Editor");

  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    image_url: "",
    video_url: "",
    external_url: "",
    category: "general",
    status: "published",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("nora_prensa_role") || "Editor";
      setOperatorName(storedRole);
    }

    if (articleId) {
      async function fetchArticle() {
        setLoading(true);
        const { data } = await supabase.from("articles").select("*").eq("id", articleId).single();
        if (data) {
          setFormData({
            title: data.title || "",
            excerpt: data.excerpt || "",
            content: data.content || "",
            image_url: data.image_url || "",
            video_url: data.video_url || "",
            external_url: data.external_url || "",
            category: data.category || "general",
            status: data.status || "published",
          });
        }
        setLoading(false);
      }
      fetchArticle();
    }
  }, [articleId]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.title.trim()) {
      alert("Por favor ingrese el título de la noticia.");
      return;
    }

    setSaving(true);
    try {
      if (articleId) {
        await supabase
          .from("articles")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", articleId);
      } else {
        const { data, error } = await supabase
          .from("articles")
          .insert([formData])
          .select()
          .single();

        if (!error && data) {
          router.push(`/admin/editor?id=${data.id}`);
        }
      }
      alert("¡Artículo guardado exitosamente!");
    } catch (err: any) {
      alert("Error al guardar: " + err?.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishAll = async () => {
    if (!formData.title.trim()) {
      alert("Por favor guarde un título primero.");
      return;
    }

    setDispatching(true);
    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: articleId || undefined,
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt,
          imageUrl: formData.image_url,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("🎉 ¡Noticia publicada en WordPress y redes conectadas con éxito!");
      } else {
        alert("Aviso de despacho: " + (data.message || data.error));
      }
    } catch (err: any) {
      alert("Error de conexión al despachar: " + err?.message);
    } finally {
      setDispatching(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 font-mono text-xs">Cargando artículo...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-serif font-black text-white uppercase tracking-wider">
              {articleId ? "Editar Noticia" : "Crear Nueva Noticia"}
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              Redacción Asistida con Nora Copilot (Español Neutro Latino)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Guardando..." : "Guardar"}</span>
          </button>

          <button
            type="button"
            onClick={handlePublishAll}
            disabled={dispatching}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
          >
            {dispatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            <span>{dispatching ? "Publicando..." : "Publicar en WordPress & Redes"}</span>
          </button>
        </div>
      </div>

      {/* 2-Column Grid: Form + Nora Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Form Fields */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Título Principal de la Noticia
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Concluyen obras de modernización en el tendido eléctrico de la ciudad"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-base font-bold text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Copete o Resumen (Excerpt)
            </label>
            <textarea
              rows={2}
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              placeholder="Breve introducción informativa de 1 a 2 oraciones..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Cuerpo de la Noticia (Formato HTML / Párrafos)
            </label>
            <textarea
              rows={12}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Escriba o pegue el contenido aquí. Puede usar <p> y <strong>..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-xs font-sans leading-relaxed text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Categoría
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="general">General</option>
                <option value="local">Locales / Ituzaingó</option>
                <option value="provincial">Provinciales / Corrientes</option>
                <option value="nacional">Nacionales</option>
                <option value="economia">Economía</option>
                <option value="deportes">Deportes</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="published">Publicado</option>
                <option value="draft">Borrador</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Imagen Destacada (URL o Subir Archivo)
            </label>
            <input
              type="text"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 mb-2"
            />
            <MediaUploader
              onUploadSuccess={(url) => setFormData({ ...formData, image_url: url })}
              label="📷 Subir Imagen a Supabase Storage"
            />
          </div>
        </div>

        {/* Column 2: Nora Copilot Assistant */}
        <div className="space-y-4">
          <div className="glass-panel p-4 border border-white/10 rounded-2xl bg-slate-950/40">
            <NoraAssistant
              title={formData.title}
              content={formData.content}
              operatorName={operatorName}
              onApplyChanges={(newTitle, newContent) => {
                setFormData({
                  ...formData,
                  title: newTitle || formData.title,
                  content: newContent || formData.content,
                });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminEditorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-mono text-xs">Cargando editor...</div>}>
      <EditorContent />
    </Suspense>
  );
}
