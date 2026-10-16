"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { 
  Plus, 
  Share2, 
  Trash2, 
  ExternalLink, 
  Star, 
  RefreshCw, 
  Globe, 
  CheckCircle, 
  AlertCircle,
  FileText
} from "lucide-react";
import QuickShareModal from "@/components/Admin/QuickShareModal";

export default function AdminNewsDeskPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverId, setCoverId] = useState<string | null>(null);
  const [selectedArticleForShare, setSelectedArticleForShare] = useState<any | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const fetchArticles = async () => {
    setLoading(true);

    const { data: coverSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "main_cover_article_id")
      .maybeSingle();

    if (coverSetting && coverSetting.value) {
      setCoverId(coverSetting.value);
    }

    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setArticles(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    const { error } = await supabase.from("articles").update({ status: newStatus }).eq("id", id);
    if (!error) fetchArticles();
  };

  const handleSetCover = async (id: string) => {
    await supabase.from("settings").upsert({ key: "main_cover_article_id", value: id });
    setCoverId(id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este artículo?")) return;
    await supabase.from("articles").delete().eq("id", id);
    fetchArticles();
  };

  const handleOpenShare = (article: any) => {
    setSelectedArticleForShare(article);
    setIsShareModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h1 className="text-2xl md:text-3xl font-serif font-black text-white tracking-widest uppercase">
              Mesa Central • <span className="text-red-500">Prensa & Noticias</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Cadena 4 • Sistema Editorial & Distribución Omnicanal
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchArticles}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/admin/editor"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Noticia</span>
          </Link>
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-slate-950/60 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-mono">
            Cargando base editorial...
          </div>
        ) : articles.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm">No hay artículos publicados todavía.</p>
            <Link
              href="/admin/editor"
              className="inline-block text-xs font-bold text-red-400 hover:underline uppercase tracking-wider"
            >
              Crear la primera noticia con Nora Copilot →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono">
                  <th className="p-4">Título del Artículo</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Distribución</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white max-w-sm truncate text-sm">
                        {article.title}
                      </p>
                      {article.excerpt && (
                        <p className="text-slate-400 text-[11px] truncate max-w-sm mt-0.5">
                          {article.excerpt}
                        </p>
                      )}
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 uppercase tracking-wider text-[10px] font-bold">
                        {article.category || "General"}
                      </span>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => handleStatusToggle(article.id, article.status)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          article.status === "published"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {article.status === "published" ? "Publicado" : "Borrador"}
                      </button>
                    </td>

                    <td className="p-4">
                      {article.wp_post_id ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> WordPress WP#{article.wp_post_id}
                        </span>
                      ) : article.social_published ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> En Redes
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">Pendiente</span>
                      )}
                    </td>

                    <td className="p-4 text-slate-400 font-mono text-[11px]">
                      {new Date(article.created_at).toLocaleDateString("es-AR")}
                    </td>

                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenShare(article)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/40 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-colors"
                        title="Abrir Asistente de Redes y Despacho Omnicanal"
                      >
                        <Share2 className="w-3 h-3" /> Redes
                      </button>

                      {coverId === article.id ? (
                        <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400" /> Portada
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetCover(article.id)}
                          className="text-slate-400 hover:text-amber-400 text-[11px] font-bold transition-colors"
                          title="Fijar como portada principal"
                        >
                          ☆ Portada
                        </button>
                      )}

                      <Link
                        href={`/admin/editor?id=${article.id}`}
                        className="text-slate-300 hover:text-white text-[11px] font-bold transition-colors uppercase"
                      >
                        Editar
                      </Link>

                      <button
                        onClick={() => handleDelete(article.id)}
                        className="text-red-400/80 hover:text-red-300 text-[11px] font-bold transition-colors uppercase"
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Omnicanal de Publicación Asistida */}
      <QuickShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        article={selectedArticleForShare}
      />
    </div>
  );
}
