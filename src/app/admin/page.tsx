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
  FileText,
  QrCode,
  Copy,
  Check,
  Radio,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import QuickShareModal from "@/components/Admin/QuickShareModal";
import QRCode from "qrcode";

export default function AdminNewsDeskPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverId, setCoverId] = useState<string | null>(null);
  const [selectedArticleForShare, setSelectedArticleForShare] = useState<any | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Nora Móvil Quick-Access State
  const [targetUrl, setTargetUrl] = useState("https://prensa-nexora-cadena4.vercel.app/corresponsal-movil");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPwaGuide, setShowPwaGuide] = useState(false);

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

    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/corresponsal-movil`;
      setTargetUrl(url);

      QRCode.toDataURL(
        url,
        {
          width: 260,
          margin: 1.5,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        },
        (err, dataUri) => {
          if (!err && dataUri) {
            setQrDataUrl(dataUri);
          }
        }
      );
    }
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

  const handleCopyNoraLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🎙️ *CADENA 4 • TERMINAL DE EXTERIORES NORA MÓVIL*\n\nAcceso directo para móviles, cronistas y corresponsales:\n${targetUrl}\n\nPIN de Ingreso: *MovilCalle123*\n\n(Ábrelo desde tu celular para grabar audios, enviar fotos y notas de exteriores directo al estudio de prensa)`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h1 className="text-xl md:text-3xl font-serif font-black text-white tracking-widest uppercase">
              Mesa Central • <span className="text-red-500">Prensa & Noticias</span>
            </h1>
          </div>
          <p className="text-[11px] md:text-xs text-slate-400 font-mono mt-1">
            Cadena 4 • Sistema Editorial & Distribución Omnicanal
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* HERO CARD: DESPLIEGUE DIRECTO DE NORA PERIODISTA DE EXTERIORES (QR & LINK) */}
      <div className="bg-gradient-to-br from-orange-950/60 via-slate-950 to-slate-900 border border-orange-500/40 rounded-2xl p-4 md:p-6 shadow-2xl relative overflow-hidden">
        {/* Glow de fondo */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-6 justify-between">
          {/* Columna Izquierda: Información y Acciones Rápidas */}
          <div className="space-y-3 flex-1 text-left w-full">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                Nora Periodista Móvil de Exteriores
              </span>
              <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 text-[9px] font-mono">
                PIN: MovilCalle123
              </span>
            </div>

            <h2 className="text-lg md:text-2xl font-black text-white leading-tight">
              Despliega la Terminal de Exteriores en Cualquier Celular
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Sin descargas pesadas desde tiendas de apps. Escanea el QR o comparte el enlace directo con tus movileros y cronistas para que graben testimonios de la calle con transcripción de audio, fotos geolocalizadas y despacho en vivo al estudio.
            </p>

            {/* Fila de Botones de Acción Inmediata */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <a
                href="/corresponsal-movil"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all"
              >
                <Smartphone className="w-4 h-4" />
                <span>Abrir Nora Móvil</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>

              <button
                onClick={handleCopyNoraLink}
                type="button"
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Enlace Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-orange-400" />
                    <span>Copiar Enlace</span>
                  </>
                )}
              </button>

              <button
                onClick={handleShareWhatsApp}
                type="button"
                className="px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>Enviar por WhatsApp</span>
              </button>

              <button
                onClick={() => setShowPwaGuide(!showPwaGuide)}
                type="button"
                className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-mono text-[11px] flex items-center gap-1 transition-colors"
                title="Cómo instalar en pantalla de inicio del celular"
              >
                <Info className="w-3.5 h-3.5 text-orange-400" />
                <span>Instalar Icono Móvil</span>
                {showPwaGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Mini Guía PWA Desplegable */}
            {showPwaGuide && (
              <div className="mt-3 p-3.5 rounded-xl bg-black/70 border border-orange-500/20 text-slate-300 text-xs space-y-2 animate-in fade-in duration-200">
                <div className="font-bold text-orange-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" /> Cómo tener el icono de la App nativa en tu celular:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                    <strong className="text-white block mb-0.5">🤖 En Android (Chrome):</strong>
                    Abre el enlace en Chrome, presiona los 3 puntos (arriba a la derecha) y toca <strong>&quot;Agregar a la pantalla principal&quot;</strong> o &quot;Instalar Aplicación&quot;.
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                    <strong className="text-white block mb-0.5">🍏 En iPhone (Safari):</strong>
                    Abre el enlace en Safari, toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha) y selecciona <strong>&quot;Agregar al inicio&quot;</strong>.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Tarjeta con Código QR Escaneable */}
          <div className="flex flex-col items-center p-3.5 bg-white text-slate-900 rounded-2xl shadow-xl shrink-0 border border-orange-400/40">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 mb-1 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" /> Escanear con Celular
            </span>

            <div className="bg-slate-100 p-2 rounded-xl border border-slate-300">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Código QR Nora Móvil Exteriores"
                  className="w-36 h-36 md:w-44 md:h-44 object-contain"
                />
              ) : (
                <div className="w-36 h-36 md:w-44 md:h-44 flex items-center justify-center font-mono text-[10px] text-slate-500">
                  Generando QR...
                </div>
              )}
            </div>

            <Link
              href="/admin/qr"
              className="mt-2 text-[10px] font-bold text-orange-700 hover:text-orange-900 underline flex items-center gap-1"
            >
              Imprimir Afiche / Cartelera Completa →
            </Link>
          </div>
        </div>
      </div>

      {/* SECCIÓN ARTÍCULOS: RESPONSIVE DUAL (TARJETAS TOUCH EN MÓVIL + TABLA EN DESKTOP) */}
      <div className="bg-slate-950/60 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-500" />
            <h3 className="font-serif font-black text-sm uppercase tracking-wider text-white">
              Artículos & Noticias ({articles.length})
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {loading ? "Actualizando..." : "Base de datos sincronizada"}
          </span>
        </div>

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
          <>
            {/* VISTA 1: CARDS TOUCH PARA CELULARES (md:hidden) */}
            <div className="md:hidden divide-y divide-white/5">
              {articles.map((article) => (
                <div key={article.id} className="p-4 space-y-3 hover:bg-white/5 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 uppercase tracking-wider text-[9px] font-bold">
                      {article.category || "General"}
                    </span>
                    <span className="text-slate-500 font-mono text-[10px]">
                      {new Date(article.created_at).toLocaleDateString("es-AR")}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-sm leading-snug">
                    {article.title}
                  </h4>

                  {article.excerpt && (
                    <p className="text-slate-400 text-xs line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleStatusToggle(article.id, article.status)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        article.status === "published"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {article.status === "published" ? "✓ Publicado" : "⏳ Borrador"}
                    </button>

                    {article.wp_post_id ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 font-bold">
                        <CheckCircle className="w-3 h-3" /> WP#{article.wp_post_id}
                      </span>
                    ) : article.social_published ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                        <CheckCircle className="w-3 h-3" /> En Redes
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">Sin distribuir</span>
                    )}
                  </div>

                  {/* Botones de Acción Móviles */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/5 text-center">
                    <button
                      onClick={() => handleOpenShare(article)}
                      className="py-1.5 px-2 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1"
                    >
                      <Share2 className="w-3 h-3" /> Redes
                    </button>

                    {coverId === article.id ? (
                      <span className="py-1.5 px-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" /> Portada
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetCover(article.id)}
                        className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-amber-300 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1"
                      >
                        ☆ Portada
                      </button>
                    )}

                    <Link
                      href={`/admin/editor?id=${article.id}`}
                      className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center"
                    >
                      Editar
                    </Link>

                    <button
                      onClick={() => handleDelete(article.id)}
                      className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-red-400/80 hover:text-red-300 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* VISTA 2: TABLA EXPANDIDA PARA PANTALLAS GRANDES (hidden md:table) */}
            <div className="hidden md:block overflow-x-auto">
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
          </>
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
