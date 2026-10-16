"use client";

import React, { useEffect, useState } from "react";
import { 
  fetchStagingQueue, 
  fetchEditorialAlerts, 
  deleteStagingItem, 
  updateStagingItem, 
  getPartnerWebhookUrl, 
  savePartnerWebhookUrl, 
  approveStagingItem,
  getPartnersList,
  savePartnersList,
  StagingQueueItem,
  EditorialAlert,
  archiveStagingItem,
  auditReportSafety
} from "../actions/corresponsal";
import { 
  MapPin, 
  User, 
  Calendar, 
  Check, 
  Trash2, 
  Settings, 
  AlertTriangle, 
  ExternalLink, 
  FileText, 
  Edit, 
  Save, 
  RefreshCw, 
  Info,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Plus,
  Globe,
  Archive,
  QrCode,
  ShieldAlert,
  Volume2
} from "lucide-react";
import Link from "next/link";
import { getClosestLocation, parseCoordinates } from "@/lib/location-db";
import { supabase } from "@/lib/supabase/client";
import { getStaffRole } from "../actions";
import QuickShareModal from "@/components/Admin/QuickShareModal";

export default function CorresponsalStagingPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [queue, setQueue] = useState<StagingQueueItem[]>([]);
  const [alerts, setAlerts] = useState<EditorialAlert[]>([]);
  const [partners, setPartners] = useState<{ id: string; name: string; url: string }[]>([]);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerUrl, setNewPartnerUrl] = useState("");
  const [selectedPartners, setSelectedPartners] = useState<Record<string, string[]>>({});
  const [shareModalItem, setShareModalItem] = useState<any>(null);
  const [auditResults, setAuditResults] = useState<Record<string, any>>({});
  const [auditingId, setAuditingId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [activeTab, setActiveTab] = useState<Record<string, 'nexativa' | 'partner'>>({});
  
  // Staging item editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNexativaTitle, setEditNexativaTitle] = useState("");
  const [editNexativaExcerpt, setEditNexativaExcerpt] = useState("");
  const [editNexativaContent, setEditNexativaContent] = useState("");
  const [editPartnerTitle, setEditPartnerTitle] = useState("");
  const [editPartnerContent, setEditPartnerContent] = useState("");
  const [editPartnerFooter, setEditPartnerFooter] = useState("");
  const [editMediaUrls, setEditMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // UI state for showing/hiding transcriptions
  const [showTranscript, setShowTranscript] = useState<Record<string, boolean>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveWebhookSuccess, setSaveWebhookSuccess] = useState(false);

  // Error/Success banners
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Active vs Archive queue tab
  const [currentQueueTab, setCurrentQueueTab] = useState<'active' | 'archive'>('active');

  async function loadPageDataSilent() {
    try {
      const queueData = await fetchStagingQueue();
      setQueue(queueData);
      const alertData = await fetchEditorialAlerts();
      setAlerts(alertData);
    } catch (err) {
      console.error("Error en sincronización silenciosa:", err);
    }
  }

  useEffect(() => {
    loadPageData();

    const channel = supabase
      .channel("realtime_editorial_staging")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "editorial_staging_queue"
        },
        () => {
          loadPageDataSilent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadPageData() {
    setLoading(true);
    setMigrationRequired(false);
    try {
      const roleVal = await getStaffRole();
      setUserRole(roleVal);

      const queueData = await fetchStagingQueue();
      setQueue(queueData);
      
      const alertData = await fetchEditorialAlerts();
      setAlerts(alertData);

      const partnersData = await getPartnersList();
      setPartners(partnersData);

      // Pre-select all webhooks by default for newly loaded drafts
      const initialSelected: Record<string, string[]> = {};
      queueData.forEach(item => {
        initialSelected[item.id] = partnersData.map(p => p.url);
      });
      setSelectedPartners(initialSelected);

      // Initialize active tabs for items
      const tabs: Record<string, 'nexativa' | 'partner'> = {};
      queueData.forEach(item => {
        tabs[item.id] = 'nexativa';
      });
      setActiveTab(tabs);
    } catch (err: any) {
      if (err.message === "MIGRATION_REQUIRED") {
        setMigrationRequired(true);
      } else {
        setErrorBanner("Error cargando los datos: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerName.trim() || !newPartnerUrl.trim()) return;

    try {
      const newPartner = {
        id: `partner_${Date.now()}`,
        name: newPartnerName.trim(),
        url: newPartnerUrl.trim()
      };
      const updated = [...partners, newPartner];
      await savePartnersList(updated);
      setPartners(updated);
      setNewPartnerName("");
      setNewPartnerUrl("");
      setSaveWebhookSuccess(true);
      setTimeout(() => setSaveWebhookSuccess(false), 3000);

      // Pre-select the new partner for all items
      setSelectedPartners(prev => {
        const next = { ...prev };
        queue.forEach(item => {
          if (!next[item.id]) next[item.id] = [];
          if (!next[item.id].includes(newPartner.url)) {
            next[item.id] = [...next[item.id], newPartner.url];
          }
        });
        return next;
      });
    } catch (err: any) {
      alert("Error al agregar socio: " + err.message);
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este socio?")) return;

    try {
      const updated = partners.filter(p => p.id !== id);
      await savePartnersList(updated);
      setPartners(updated);
    } catch (err: any) {
      alert("Error al eliminar socio: " + err.message);
    }
  };

  const handleStartEdit = (item: StagingQueueItem) => {
    setEditingId(item.id);
    setEditNexativaTitle(item.version_nexativa?.title || "");
    setEditNexativaExcerpt(item.version_nexativa?.excerpt || "");
    setEditNexativaContent(item.version_nexativa?.content || "");
    setEditPartnerTitle(item.version_partner?.title || "");
    setEditPartnerContent(item.version_partner?.content || "");
    setEditPartnerFooter(item.version_partner?.attribution_footer || "");
    setEditMediaUrls(item.attached_media_url || []);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `articles/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);
      
      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
      const imageUrl = publicUrlData.publicUrl;

      setEditMediaUrls(prev => {
        const next = [...prev];
        if (next.length > 0) {
          next[0] = imageUrl;
        } else {
          next.push(imageUrl);
        }
        return next;
      });

      setSuccessBanner("Imagen de portada subida con éxito.");
      setTimeout(() => setSuccessBanner(null), 3000);
    } catch (e: any) {
      console.error(e);
      alert("Error subiendo la imagen: " + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      setActionLoadingId(id);
      const item = queue.find(q => q.id === id);
      if (!item) return;

      const updatedNexativa = item.version_nexativa ? {
        ...item.version_nexativa,
        title: editNexativaTitle,
        excerpt: editNexativaExcerpt,
        content: editNexativaContent
      } : null;

      const updatedPartner = item.version_partner ? {
        ...item.version_partner,
        title: editPartnerTitle,
        content: editPartnerContent,
        attribution_footer: editPartnerFooter
      } : null;

      await updateStagingItem(id, updatedNexativa, updatedPartner, editMediaUrls);
      
      // Update local state
      setQueue(queue.map(q => {
        if (q.id === id) {
          return {
            ...q,
            version_nexativa: updatedNexativa,
            version_partner: updatedPartner,
            attached_media_url: editMediaUrls
          };
        }
        return q;
      }));

      setEditingId(null);
      setSuccessBanner("Artículo actualizado localmente en la cola.");
      setTimeout(() => setSuccessBanner(null), 3000);
    } catch (err: any) {
      setErrorBanner("Error al guardar cambios: " + err.message);
      setTimeout(() => setErrorBanner(null), 4000);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleArchive = async (id: string, archive: boolean) => {
    try {
      setActionLoadingId(id);
      await archiveStagingItem(id, archive);
      
      setQueue(queue.map(q => {
        if (q.id === id) {
          return {
            ...q,
            status: archive ? 'ARCHIVED' : 'PENDING_REVIEW'
          };
        }
        return q;
      }));
      
      setSuccessBanner(archive ? "Reporte enviado al archivo histórico." : "Reporte devuelto a la bandeja de entrada.");
      setTimeout(() => setSuccessBanner(null), 3000);
    } catch (err: any) {
      setErrorBanner("Error al archivar: " + err.message);
      setTimeout(() => setErrorBanner(null), 4000);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este reporte de corresponsal? Se descartarán las versiones generadas.")) {
      return;
    }

    try {
      setActionLoadingId(id);
      await deleteStagingItem(id);
      setQueue(queue.filter(q => q.id !== id));
      setSuccessBanner("Reporte eliminado de la cola.");
      setTimeout(() => setSuccessBanner(null), 3000);
    } catch (err: any) {
      setErrorBanner("Error al eliminar: " + err.message);
      setTimeout(() => setErrorBanner(null), 4000);
    } finally {
      setActionLoadingId(null);
    }
  };

  
  const handleAuditReport = async (item: StagingQueueItem) => {
    setAuditingId(item.id);
    const title = item.version_partner?.title || item.raw_metadata_title || item.version_nexativa?.title || "Reporte";
    const content = item.version_partner?.content || item.transcription || "";
    const res = await auditReportSafety(title, content, item.operator_id);
    if (res.success && res.report) {
      setAuditResults(prev => ({ ...prev, [item.id]: res.report }));
    } else {
      alert("No se pudo completar la auditoría con Nora.");
    }
    setAuditingId(null);
  };

  const handleApprove = async (id: string, actionType: "APPROVE_NEXATIVA_ONLY" | "APPROVE_PARTNER_ONLY" | "APPROVE_ALL_SIMULTANEOUS") => {
    try {
      setActionLoadingId(id);
      setErrorBanner(null);
      setSuccessBanner(null);
      
      const webhooks = selectedPartners[id] || [];
      const res = await approveStagingItem(id, actionType, webhooks);
      
      if (res.success) {
        let msg = "";
        if (actionType === "APPROVE_NEXATIVA_ONLY") msg = "Publicado exitosamente en Prensa NexoraOne • Cadena 4.";
        else if (actionType === "APPROVE_PARTNER_ONLY") msg = "Despachado exitosamente al socio.";
        else msg = "Publicado en Prensa NexoraOne • Cadena 4 y despachado al socio simultáneamente.";

        if (res.webhookError) {
          msg += ` (Advertencia: Falló el webhook del socio: ${res.webhookError})`;
          setErrorBanner(`Fallo de Webhook: ${res.webhookError}`);
        } else {
          setSuccessBanner(msg);
          setTimeout(() => setSuccessBanner(null), 5000);
        }

        // Reload data to show updated statuses
        await loadPageData();
      } else {
        setErrorBanner("Fallo en la aprobación: " + res.error);
      }
    } catch (err: any) {
      setErrorBanner("Ocurrió un error: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleTranscript = (id: string) => {
    setShowTranscript(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_REVIEW":
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Pendiente de Revisión</span>;
      case "APPROVED_NEXATIVA_ONLY":
        return <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Aprobado Cadena 4</span>;
      case "APPROVED_PARTNER_ONLY":
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Aprobado Socio</span>;
      case "APPROVED_ALL_SIMULTANEOUS":
        return <span className="bg-green-500/20 text-green-300 border border-green-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Publicado & Despachado</span>;
      case "AUDIO_ERROR_MANUAL_REVIEW_REQUIRED":
        return <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Error de Audio (Revisión Manual)</span>;
      default:
        return <span className="bg-gray-500/20 text-gray-300 border border-gray-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  // Render migration requirement box
  if (migrationRequired) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-serif text-[var(--color-brand-accent)] tracking-widest uppercase">Cola de Corresponsalía</h1>
        
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-white space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-400 w-8 h-8" />
            <h2 className="text-xl font-bold">Módulo Pendiente de Activación</h2>
          </div>
          <p className="text-white/70">
            El módulo de Corresponsalía todavía no está activado en este servidor.
          </p>
          <div className="bg-black/40 p-4 rounded-lg font-mono text-xs overflow-x-auto border border-white/10 space-y-2">
            <p className="text-yellow-400 font-bold">¿Qué hacer?</p>
            <p>Contacta a soporte técnico de Nexora One para activar el módulo.</p>
            
            
            <p>Una vez activado, presiona &quot;Reintentar Carga&quot;.</p>
          </div>
          <button 
            onClick={loadPageData} 
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Reintentar Carga
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[var(--color-brand-accent)] tracking-widest uppercase">Cola de Corresponsalía</h1>
          <p className="text-xs text-white/50 uppercase tracking-widest mt-1">Staging Buffer Editorial & Copias Periodísticas</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href="/admin/news/qr"
            className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <QrCode className="w-4 h-4 text-red-400" />
            📱 Generar QR Periodismo Ciudadano
          </Link>

          {userRole && !userRole.startsWith("partner:") && (
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex-shrink-0 flex items-center gap-2"
            >
              <Settings className="w-4 h-4 text-[var(--color-brand-accent)]" />
              {settingsOpen ? "Cerrar Configuración" : "Configurar Socios (Portales)"}
            </button>
          )}
        </div>
      </div>

      {/* Settings Form */}
      {settingsOpen && (
        <div className="bg-black/30 border border-white/10 p-6 rounded-xl space-y-6 animate-fadeIn">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Globe className="text-[var(--color-brand-accent)] w-5 h-5 animate-pulse" />
            <h3 className="font-bold text-white uppercase tracking-wider text-sm">Distribución de Socios Periodísticos</h3>
          </div>

          {/* List of current partners */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase text-white/50 font-bold tracking-wider">Socios Registrados</h4>
            {partners.length === 0 ? (
              <p className="text-xs text-white/40 italic py-2">No hay socios configurados aún. Las noticias se guardarán solo localmente.</p>
            ) : (
              <div className="overflow-x-auto border border-white/5 rounded-lg bg-black/20">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-gray-400 font-bold uppercase">
                      <th className="p-3">Nombre del Socio</th>
                      <th className="p-3">URL del Webhook (Make / CMS)</th>
                      <th className="p-3 text-center w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map((partner) => (
                      <tr key={partner.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                        <td className="p-3 font-bold text-white">{partner.name}</td>
                        <td className="p-3 font-mono text-[10px] text-gray-400 truncate max-w-xs">{partner.url}</td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePartner(partner.id)}
                            className="text-red-400 hover:text-red-300 font-bold text-[10px] uppercase cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Form to add a new partner */}
          <form onSubmit={handleAddPartner} className="space-y-3 border-t border-white/5 pt-4">
            <h4 className="text-xs uppercase text-white/50 font-bold tracking-wider flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-green-400" /> Registrar Nuevo Socio
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Nombre del medio (Ej: FM Ituzaingó)"
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 focus:border-green-500 rounded-lg px-4 py-2.5 text-xs text-white placeholder-white/30 outline-none"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  placeholder="https://hook.make.com/..."
                  value={newPartnerUrl}
                  onChange={(e) => setNewPartnerUrl(e.target.value)}
                  className="flex-1 bg-black/50 border border-white/10 focus:border-green-500 rounded-lg px-4 py-2.5 text-xs text-white placeholder-white/30 outline-none"
                />
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  Agregar
                </button>
              </div>
            </div>
          </form>

          {saveWebhookSuccess && (
            <div className="bg-green-500/15 border border-green-500/20 px-4 py-2.5 rounded-lg text-xs font-bold text-green-400 tracking-wide animate-pulse">
              ✓ Socio registrado con éxito
            </div>
          )}
        </div>
      )}

      {/* Notifications */}
      {successBanner && (
        <div className="bg-green-500/20 text-green-300 border border-green-500/30 p-4 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Check className="w-5 h-5" />
          {successBanner}
        </div>
      )}
      {errorBanner && (
        <div className="bg-red-500/20 text-red-300 border border-red-500/30 p-4 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {errorBanner}
        </div>
      )}

      {/* Main Grid Tabs */}
      {!loading && (
        <div className="flex border-b border-white/10 gap-6 text-sm font-bold uppercase tracking-wider mb-6">
          <button
            onClick={() => setCurrentQueueTab('active')}
            className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
              currentQueueTab === 'active'
                ? 'text-[var(--color-brand-accent)] border-[var(--color-brand-accent)] font-black'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            <Layers className="w-4 h-4" />
            Bandeja de Entrada
            <span className="bg-amber-600/30 text-amber-300 text-[10px] px-2 py-0.5 rounded-full ml-1 font-mono font-bold">
              {queue.filter(q => q.status === 'PENDING_REVIEW' || q.status === 'AUDIO_ERROR_MANUAL_REVIEW_REQUIRED').length}
            </span>
          </button>

          <button
            onClick={() => setCurrentQueueTab('archive')}
            className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
              currentQueueTab === 'archive'
                ? 'text-purple-400 border-purple-500 font-black'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            <Archive className="w-4 h-4" />
            Biblioteca / Archivo Histórico
            <span className="bg-purple-900/30 text-purple-300 text-[10px] px-2 py-0.5 rounded-full ml-1 font-mono font-bold">
              {queue.filter(q => q.status !== 'PENDING_REVIEW' && q.status !== 'AUDIO_ERROR_MANUAL_REVIEW_REQUIRED').length}
            </span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center p-12 text-white/50 uppercase tracking-widest text-sm animate-pulse">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          Cargando cola de corresponsalía...
        </div>
      ) : (() => {
        const filteredQueue = queue.filter(item => {
          const isActive = item.status === 'PENDING_REVIEW' || item.status === 'AUDIO_ERROR_MANUAL_REVIEW_REQUIRED';
          return currentQueueTab === 'active' ? isActive : !isActive;
        });

        if (filteredQueue.length === 0) {
          return (
            <div className="text-center p-12 bg-black/10 border border-white/5 rounded-xl text-white/50 uppercase tracking-widest text-sm">
              {currentQueueTab === 'active'
                ? "No hay reportes de corresponsales activos en la bandeja de entrada."
                : "No hay reportes archivados ni publicados en la biblioteca histórica."
              }
            </div>
          );
        }

        return (
          <div className="space-y-8">
            {filteredQueue.map((item) => {
            const coords = parseCoordinates(item.geolocation_coordinates);
            const location = getClosestLocation(coords.lat, coords.lng);
            const isEditing = editingId === item.id;

            return (
              <div 
                key={item.id} 
                className={`glass-panel border rounded-xl overflow-hidden shadow-lg transition-all ${
                  item.status === 'PENDING_REVIEW' 
                    ? 'border-white/10 hover:border-amber-500/30 shadow-black/30' 
                    : item.status === 'AUDIO_ERROR_MANUAL_REVIEW_REQUIRED'
                    ? 'border-red-500/20 hover:border-red-500/40 shadow-red-950/10'
                    : 'border-white/5 bg-white/[0.02] opacity-70'
                }`}
              >
                
                {/* 🛡️ BANNER DE MESA EDITORIAL & CONTROL ANTI-FAKE NEWS */}
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-300">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      <strong>Control Editorial Obligatorio:</strong> Reporte de exteriores sujeto a evaluación del editor de estudio antes de su difusión pública.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAuditReport(item)}
                    disabled={auditingId === item.id}
                    className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${auditingId === item.id ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
                    <span>{auditingId === item.id ? 'Auditando...' : '🔍 Auditar Anti-Fake News & Legal'}</span>
                  </button>
                </div>

                {/* Resultado de la Auditoría si existe */}
                {auditResults[item.id] && (
                  <div className={`mx-6 my-3 p-4 rounded-xl border text-xs space-y-2 ${
                    auditResults[item.id].verdict === 'APROBADO_CONFIABLE'
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : auditResults[item.id].verdict === 'REQUIERE_REVISION'
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                      : 'bg-red-950/30 border-red-500/40 text-red-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider flex items-center gap-2">
                        <span>Puntaje de Veracidad: <strong>{auditResults[item.id].veracityScore}/100</strong></span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 border border-white/10">
                          {auditResults[item.id].verdict}
                        </span>
                      </span>
                      <span className="text-[10px] text-white/50">Auditoría Nora AI</span>
                    </div>
                    <p className="leading-relaxed"><strong>Diagnóstico:</strong> {auditResults[item.id].summary}</p>
                    {auditResults[item.id].legalNotes && (
                      <p className="text-white/70"><strong>Resguardo Legal:</strong> {auditResults[item.id].legalNotes}</p>
                    )}
                    {auditResults[item.id].detectedRisks?.length > 0 && (
                      <div className="text-[11px] space-y-0.5">
                        <strong>Riesgos Detectados:</strong>
                        <ul className="list-disc pl-4 text-white/70">
                          {auditResults[item.id].detectedRisks.map((r: string, idx: number) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Meta Panel (Top bar) */}
                <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-white/70">
                      <User className="w-4 h-4 text-[var(--color-brand-accent)]" />
                      <span className="font-bold">ID Operador:</span>
                      <span className="font-mono text-xs">{item.operator_id.substring(0, 8)}...</span>
                    </div>

                    <div className="flex items-center gap-2 text-white/70">
                      <MapPin className="w-4 h-4 text-[var(--color-brand-accent)]" />
                      <span className="font-bold">Ubicación:</span>
                      <span 
                        title={`Coordenadas exactas: ${item.geolocation_coordinates}`} 
                        className="underline decoration-dotted decoration-white/30 cursor-help"
                      >
                        {location?.name || "Corrientes / Ituzaingó"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-white/70">
                      <Calendar className="w-4 h-4 text-[var(--color-brand-accent)]" />
                      <span className="font-bold">Fecha:</span>
                      <span>{new Date(item.created_at).toLocaleString("es-AR")}</span>
                    </div>
                  </div>

                  <div>
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-6">
                  {/* Title references & Media images */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Basic details */}
                    <div className="lg:col-span-2 space-y-4">
                      <div>
                        <h4 className="text-xs uppercase text-white/40 font-bold tracking-wider">Referencia de Título de Campo</h4>
                        <p className="text-white font-medium text-lg mt-1">{item.raw_metadata_title || "Sin título de referencia"}</p>
                      </div>

                      {/* Toggleable Transcription Box */}
                      <div className="bg-black/30 border border-white/5 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleTranscript(item.id)}
                          className="w-full flex justify-between items-center px-4 py-3 bg-white/5 text-xs text-white/70 hover:text-white transition-colors uppercase tracking-wider font-bold"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[var(--color-brand-accent)]" />
                            Transcripción de Audio limpia
                          </span>
                          {showTranscript[item.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        
                        {showTranscript[item.id] && (
                          <div className="p-4 font-mono text-xs text-white/80 leading-relaxed bg-black/60 max-h-48 overflow-y-auto select-all">
                            {item.transcription}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Media images */}
                    <div className="bg-black/20 border border-white/5 p-4 rounded-xl space-y-2">
                      <h4 className="text-xs uppercase text-white/40 font-bold tracking-wider flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" /> Media Adjunta ({item.attached_media_url?.length || 0})
                      </h4>
                      {item.attached_media_url && item.attached_media_url.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {Array.from(new Set(item.attached_media_url)).map((mediaUrl, index) => {
                            const isAudio = mediaUrl.includes('corresponsales_audio') || mediaUrl.includes('audio') || mediaUrl.endsWith('.mp3') || mediaUrl.endsWith('.m4a') || mediaUrl.endsWith('.wav');
                            const isVideo = !isAudio && (mediaUrl.includes('corresponsales_video') || mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.mov') || mediaUrl.endsWith('.webm'));

                            if (isAudio) {
                              return (
                                <div key={index} className="col-span-2 bg-black/60 border border-white/10 p-2.5 rounded-lg flex items-center gap-2">
                                  <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
                                  <audio src={mediaUrl} controls className="w-full h-8" />
                                </div>
                              );
                            }

                            if (isVideo) {
                              return (
                                <div key={index} className="relative aspect-video border border-white/10 rounded overflow-hidden bg-black">
                                  <video src={mediaUrl} controls className="w-full h-full object-contain" />
                                </div>
                              );
                            }

                            return (
                              <a 
                                key={index}
                                href={mediaUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="group relative aspect-video border border-white/10 rounded overflow-hidden hover:border-[var(--color-brand-accent)] transition-all bg-black/50"
                              >
                                <img 
                                  src={mediaUrl} 
                                  alt={`Media ${index}`} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ExternalLink className="w-4 h-4 text-white" />
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-white/30 italic py-4 text-center">Sin imágenes o videos adjuntos</p>
                      )}
                    </div>
                  </div>

                  {/* Versions block */}
                  <hr className="border-white/5" />

                  <div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-4">
                      <h3 className="font-bold text-[var(--color-brand-text)] uppercase tracking-wider text-sm">Copias Redactadas (Nora AI)</h3>
                      {!isEditing && (item.status === 'PENDING_REVIEW' || item.status === 'AUDIO_ERROR_MANUAL_REVIEW_REQUIRED') && (
                        <button
                          onClick={() => handleStartEdit(item)}
                          disabled={actionLoadingId !== null}
                          className="bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors font-bold uppercase tracking-wider"
                        >
                          <Edit className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
                          Editar Textos
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      /* Editing Interface */
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white/[0.02] p-4 rounded-xl border border-white/10">
                        {/* Edit versión principal */}
                        <div className="space-y-4 border-r border-white/5 pr-0 lg:pr-6">
                          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-md shadow-blue-500/50" />
                            <h4 className="font-bold text-sm uppercase text-white/80">Editar Versión Cadena 4 (Principal)</h4>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="block text-xs uppercase text-white/50 font-bold">Título</label>
                            <input
                              type="text"
                              value={editNexativaTitle}
                              onChange={(e) => setEditNexativaTitle(e.target.value)}
                              className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="block text-xs uppercase text-white/50 font-bold">Copete / Bajada Periodística</label>
                              <div className="flex items-center gap-1 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => setEditNexativaExcerpt("")}
                                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                                    !editNexativaExcerpt
                                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                      : 'bg-white/5 text-gray-400 hover:text-white'
                                  }`}
                                >
                                  ⚪ Omitir Copete
                                </button>
                              </div>
                            </div>
                            <textarea
                              value={editNexativaExcerpt}
                              onChange={(e) => setEditNexativaExcerpt(e.target.value)}
                              rows={2}
                              placeholder="Ingresá el copete o dejalo en blanco si preferís omitirlo..."
                              maxLength={150}
                              className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                            <p className="text-[10px] text-white/40 flex justify-between">
                              <span>{editNexativaExcerpt ? '🟢 Copete activo' : '⚪ Copete omitido (La noticia iniciará directamente en el cuerpo)'}</span>
                              <span>{editNexativaExcerpt.length}/150 caracteres</span>
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs uppercase text-white/50 font-bold">Contenido (HTML)</label>
                            <textarea
                              value={editNexativaContent}
                              onChange={(e) => setEditNexativaContent(e.target.value)}
                              rows={8}
                              className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Edit Partner */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-md shadow-purple-500/50" />
                            <h4 className="font-bold text-sm uppercase text-white/80">Editar Versión Socio (Sindicada)</h4>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs uppercase text-white/50 font-bold">Título</label>
                            <input
                              type="text"
                              value={editPartnerTitle}
                              onChange={(e) => setEditPartnerTitle(e.target.value)}
                              className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs uppercase text-white/50 font-bold">Contenido (HTML)</label>
                            <textarea
                              value={editPartnerContent}
                              onChange={(e) => setEditPartnerContent(e.target.value)}
                              rows={8}
                              className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs uppercase text-white/50 font-bold">Pie de Atribución</label>
                            <input
                              type="text"
                              value={editPartnerFooter}
                              onChange={(e) => setEditPartnerFooter(e.target.value)}
                              className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>

                        {/* Edit Cover Image */}
                        <div className="lg:col-span-2 border-t border-white/5 pt-4 space-y-4">
                          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-md shadow-amber-500/50" />
                            <h4 className="font-bold text-sm uppercase text-white/80">Editar Imagen de Portada</h4>
                          </div>
                          
                          <div className="flex flex-col md:flex-row gap-6 items-center bg-black/20 p-4 rounded-lg border border-white/5">
                            {/* Preview */}
                            <div className="w-full md:w-48 aspect-video border border-white/10 bg-black/40 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                              {editMediaUrls.length > 0 && editMediaUrls[0] ? (
                                <img 
                                  src={editMediaUrls[0]} 
                                  alt="Vista previa de portada" 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs text-white/30 italic">Sin portada</span>
                              )}
                            </div>
                            
                            <div className="flex-1 w-full space-y-3">
                              <div className="space-y-1">
                                <label className="block text-xs uppercase text-white/50 font-bold">URL de la Imagen de Portada</label>
                                <input
                                  type="text"
                                  value={editMediaUrls[0] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditMediaUrls(prev => {
                                      const next = [...prev];
                                      if (next.length > 0) {
                                        next[0] = val;
                                      } else {
                                        next.push(val);
                                      }
                                      return next;
                                    });
                                  }}
                                  placeholder="https://ejemplo.com/imagen.jpg"
                                  className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <label className="bg-amber-600 hover:bg-amber-500 text-black px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2">
                                  {isUploading ? "Subiendo..." : "Subir nueva imagen"}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isUploading}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleImageUpload(file);
                                    }}
                                  />
                                </label>
                                
                                {editMediaUrls.length > 0 && editMediaUrls[0] && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditMediaUrls(prev => {
                                        const next = [...prev];
                                        next[0] = "";
                                        return next;
                                      });
                                    }}
                                    className="bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-300 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors"
                                  >
                                    Quitar Portada
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-2 border-t border-white/5 pt-4 flex justify-end gap-3">
                          <button
                            onClick={handleCancelEdit}
                            className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                          >
                            <Save className="w-4 h-4" /> Guardar Cambios
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Interface with tabs */
                      <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                        <div className="flex border-b border-white/5 bg-white/5">
                          <button
                            onClick={() => setActiveTab(prev => ({ ...prev, [item.id]: 'nexativa' }))}
                            className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${
                              activeTab[item.id] === 'nexativa'
                                ? 'text-blue-400 border-blue-500 bg-blue-500/5'
                                : 'text-white/50 border-transparent hover:text-white/80'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            Versión A (Cadena 4 Principal)
                          </button>
                          <button
                            onClick={() => setActiveTab(prev => ({ ...prev, [item.id]: 'partner' }))}
                            className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${
                              activeTab[item.id] === 'partner'
                                ? 'text-purple-400 border-purple-500 bg-purple-500/5'
                                : 'text-white/50 border-transparent hover:text-white/80'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-purple-400" />
                            Versión B (Socio Alternativo)
                          </button>
                        </div>

                        <div className="p-6">
                          {activeTab[item.id] === 'nexativa' ? (
                            /* Versión principal */
                            <div className="space-y-4">
                              {item.version_nexativa ? (
                                <>
                                  <h2 className="text-2xl font-serif text-white font-bold leading-tight">{item.version_nexativa.title}</h2>
                                  
                                  <div className="bg-white/5 p-4 rounded border-l-4 border-[var(--color-brand-accent)] text-white/80 text-sm leading-relaxed italic">
                                    <strong>Copete:</strong> {item.version_nexativa.excerpt}
                                  </div>

                                  <div 
                                    className="text-white/70 text-sm leading-relaxed space-y-3 prose-custom"
                                    dangerouslySetInnerHTML={{ __html: item.version_nexativa.content }}
                                  />

                                  {item.version_nexativa.tags && item.version_nexativa.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                                      {item.version_nexativa.tags.map((tag, i) => (
                                        <span key={i} className="bg-blue-900/30 text-blue-300 border border-blue-800/40 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <p className="text-white/40 italic text-sm">Versión no disponible</p>
                              )}
                            </div>
                          ) : (
                            /* Partner Display */
                            <div className="space-y-4">
                              {item.version_partner ? (
                                <>
                                  <h2 className="text-2xl font-serif text-white font-bold leading-tight">{item.version_partner.title}</h2>
                                  
                                  <div 
                                    className="text-white/70 text-sm leading-relaxed space-y-3 prose-custom"
                                    dangerouslySetInnerHTML={{ __html: item.version_partner.content }}
                                  />

                                  <div className="bg-white/5 p-4 rounded border border-white/10 text-white/50 text-[11px] leading-relaxed italic flex items-center gap-2">
                                    <Info className="w-4 h-4 text-purple-400 shrink-0" />
                                    <span>
                                      <strong>Pie de Atribución:</strong> {item.version_partner.attribution_footer || "Cobertura en exteriores por gentileza de Prensa NexoraOne • Cadena 4"}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <p className="text-white/40 italic text-sm">Versión no disponible</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                {(item.status === 'PENDING_REVIEW' || item.status === 'AUDIO_ERROR_MANUAL_REVIEW_REQUIRED' || item.status === 'ARCHIVED') && (
                  <div className="bg-white/[0.02] border-t border-white/10 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={actionLoadingId !== null}
                        className="bg-red-500/10 hover:bg-red-500/30 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" /> Descartar
                      </button>

                      {item.status === 'ARCHIVED' ? (
                        <button
                          onClick={() => handleArchive(item.id, false)}
                          disabled={actionLoadingId !== null}
                          className="bg-amber-600 hover:bg-amber-500 text-black px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className="w-4 h-4" /> Desarchivar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchive(item.id, true)}
                          disabled={actionLoadingId !== null}
                          className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Archive className="w-4 h-4" /> Archivar
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Checkboxes for selected partners */}
                      {partners.length > 0 && (
                        <div className="flex flex-wrap items-center gap-3 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 text-[10px] text-gray-300 font-bold mr-2">
                          <span className="uppercase text-white/40 font-black">Enviar a:</span>
                          {partners.map(p => {
                            const isChecked = (selectedPartners[item.id] || []).includes(p.url);
                            return (
                              <label key={p.id} className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedPartners(prev => {
                                      const current = prev[item.id] || [];
                                      const updated = current.includes(p.url)
                                        ? current.filter(u => u !== p.url)
                                        : [...current, p.url];
                                      return { ...prev, [item.id]: updated };
                                    });
                                  }}
                                  className="accent-purple-500 rounded border-white/10"
                                />
                                <span>{p.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      <button
                        onClick={() => handleApprove(item.id, "APPROVE_NEXATIVA_ONLY")}
                        disabled={actionLoadingId !== null}
                        className="bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                      >
                        Aprobar Cadena 4
                      </button>
                      
                      <button
                        onClick={() => handleApprove(item.id, "APPROVE_PARTNER_ONLY")}
                        disabled={actionLoadingId !== null || (selectedPartners[item.id] || []).length === 0}
                        className="bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Despachar Socio
                      </button>
                      
                      <button
                        onClick={() => handleApprove(item.id, "APPROVE_ALL_SIMULTANEOUS")}
                        disabled={actionLoadingId !== null}
                        className="bg-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent-hover)] text-black px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 shadow-md shadow-amber-500/10 hover:shadow-amber-500/20"
                      >
                        Aprobar Todo Simultáneo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    })()}

      {/* Webhook Alerts Panel */}
      {alerts.length > 0 && (
        <div className="bg-red-950/20 border border-red-500/20 p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-red-500/10 pb-3">
            <AlertTriangle className="text-red-400 w-5 h-5 animate-pulse" />
            <h3 className="font-bold text-red-200 uppercase tracking-wider text-sm">Registro de Alertas Críticas (Socio Webhook)</h3>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="bg-black/30 border border-red-500/10 p-4 rounded-lg flex gap-3 text-xs">
                <Clock className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex justify-between items-center text-white/40">
                    <span className="font-mono text-[10px]">ID Alerta: {alert.id.substring(0, 8)}</span>
                    <span>{new Date(alert.created_at).toLocaleString("es-AR")}</span>
                  </div>
                  <p className="text-red-300 font-bold">{alert.message}</p>
                  {alert.details && (
                    <div className="bg-black/40 p-2.5 rounded font-mono text-[10px] text-white/50 mt-1 whitespace-pre-wrap">
                      URL: {alert.details.partner_webhook_url}<br />
                      Intentos: {alert.details.attempts}<br />
                      Error: {alert.details.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        <QuickShareModal
        isOpen={!!shareModalItem}
        onClose={() => setShareModalItem(null)}
        article={shareModalItem}
      />
    </div>
  );
}

