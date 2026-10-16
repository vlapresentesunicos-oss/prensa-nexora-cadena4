"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Newspaper, 
  PenTool, 
  Radio, 
  Sparkles, 
  Film, 
  Inbox, 
  QrCode, 
  Share2, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  LogOut,
  Globe,
  Flame
} from "lucide-react";

interface AdminSidebarProps {
  userRole?: string;
  onLogout?: () => void;
}

export default function AdminSidebar({ userRole = "Director", onLogout }: AdminSidebarProps) {
  const pathname = usePathname();

  const [openSections, setOpenSections] = useState({
    redaccion: true,
    envivo: true,
    calle: true,
    distribucion: true,
  });

  const toggleSection = (sec: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const isActive = (path: string) => {
    if (path === "/admin") return pathname === "/admin";
    return pathname.startsWith(path);
  };

  return (
    <aside className="w-64 glass-panel m-3 flex flex-col hidden md:flex border border-white/10 shrink-0 h-[calc(100vh-24px)] select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center font-black text-white text-xs shadow-lg shadow-red-500/20">
            N1
          </div>
          <span className="font-serif font-black tracking-widest text-sm uppercase text-white">
            Prensa <span className="text-red-500">NexoraOne</span>
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-white/50 uppercase tracking-wider font-mono">
          <span>Cadena 4 • Enlace Oficial</span>
          <span className="text-amber-400 font-bold">{userRole}</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-3 font-sans text-xs hide-scrollbar">
        
        {/* SECTOR 1: REDACCIÓN CENTRAL */}
        <div className="rounded-xl overflow-hidden bg-slate-950/40 border border-white/5">
          <button
            type="button"
            onClick={() => toggleSection("redaccion")}
            className="w-full px-3 py-2 text-white/80 font-bold flex items-center justify-between hover:bg-white/5 uppercase tracking-wider text-[10px]"
          >
            <span className="flex items-center gap-1.5 text-slate-300">
              <Newspaper className="w-3.5 h-3.5 text-red-400" />
              <span>Redacción Central</span>
            </span>
            {openSections.redaccion ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          
          {openSections.redaccion && (
            <div className="p-1 space-y-0.5">
              <Link
                href="/admin"
                className={`px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${
                  isActive("/admin")
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <span>📰 Noticias & Artículos</span>
              </Link>

              <Link
                href="/admin/editor"
                className={`px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${
                  isActive("/admin/editor")
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <PenTool className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Redactor Pro (Nora Copilot)</span>
              </Link>
            </div>
          )}
        </div>

        {/* SECTOR 2: EN VIVO & MULTIMODAL */}
        <div className="rounded-xl overflow-hidden bg-slate-950/40 border border-white/5">
          <button
            type="button"
            onClick={() => toggleSection("envivo")}
            className="w-full px-3 py-2 text-white/80 font-bold flex items-center justify-between hover:bg-white/5 uppercase tracking-wider text-[10px]"
          >
            <span className="flex items-center gap-1.5 text-red-400">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Producción En Vivo</span>
            </span>
            {openSections.envivo ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {openSections.envivo && (
            <div className="p-1 space-y-0.5">
              <Link
                href="/admin/live"
                className={`px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${
                  isActive("/admin/live")
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span>Nora Live Exteriores</span>
              </Link>

              <Link
                href="/admin/flashes"
                className={`px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${
                  isActive("/admin/flashes")
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Flashes Noticiosos (1-5 min)</span>
              </Link>

              <Link
                href="/admin/clipper"
                className={`px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${
                  isActive("/admin/clipper")
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <Film className="w-3.5 h-3.5 text-purple-400" />
                <span>Nora Auto-Clipper Radio/TV</span>
              </Link>
            </div>
          )}
        </div>

        {/* SECTOR 3: CORRESPONSALÍA & CALLE */}
        <div className="rounded-xl overflow-hidden bg-slate-950/40 border border-white/5">
          <button
            type="button"
            onClick={() => toggleSection("calle")}
            className="w-full px-3 py-2 text-white/80 font-bold flex items-center justify-between hover:bg-white/5 uppercase tracking-wider text-[10px]"
          >
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Inbox className="w-3.5 h-3.5" />
              <span>Corresponsalía & Calle</span>
            </span>
            {openSections.calle ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {openSections.calle && (
            <div className="p-1 space-y-0.5">
              <Link
                href="/admin/corresponsal"
                className={`px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${
                  isActive("/admin/corresponsal")
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <span>📥 Cola de Staging & Doble-Copia</span>
              </Link>

              <Link
                href="/admin/qr"
                className={`px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${
                  isActive("/admin/qr")
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>QR Periodismo Ciudadano</span>
              </Link>
            </div>
          )}
        </div>

        {/* SECTOR 4: DISTRIBUCIÓN OMNICANAL */}
        <div className="rounded-xl overflow-hidden bg-slate-950/40 border border-white/5">
          <button
            type="button"
            onClick={() => toggleSection("distribucion")}
            className="w-full px-3 py-2 text-white/80 font-bold flex items-center justify-between hover:bg-white/5 uppercase tracking-wider text-[10px]"
          >
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Share2 className="w-3.5 h-3.5" />
              <span>Distribución Omnicanal</span>
            </span>
            {openSections.distribucion ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {openSections.distribucion && (
            <div className="p-1 space-y-0.5">
              <Link
                href="/admin/distribution"
                className={`px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${
                  isActive("/admin/distribution")
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <span>🌐 Hub Omnicanal (WP & Redes)</span>
              </Link>

              <Link
                href="/admin/settings"
                className={`px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${
                  isActive("/admin/settings")
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Ajustes de Marca Cadena 4</span>
              </Link>
            </div>
          )}
        </div>

      </nav>

      {/* Footer Branding */}
      <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-[11px] text-white/50">
        <div>
          <span className="block font-bold text-white/80">Nexora One</span>
          <span className="text-[9px]">Prensa Enterprise © 2026</span>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
