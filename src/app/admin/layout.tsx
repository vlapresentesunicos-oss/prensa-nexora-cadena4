"use client";

import React, { useEffect, useState } from "react";
import AdminSidebar from "@/components/Admin/AdminSidebar";
import InstallAppPrompt from "@/components/InstallAppPrompt";
import NoraMovilModal from "@/components/Admin/NoraMovilModal";
import PushNotificationManager from "@/components/Admin/PushNotificationManager";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Radio, 
  Share2, 
  LogOut, 
  Menu, 
  X, 
  Smartphone, 
  Newspaper, 
  PenTool, 
  Inbox,
  Flame
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState("Director");
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isNoraMovilModalOpen, setIsNoraMovilModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("nora_prensa_role") || "Director";
      setRole(storedRole);
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("nora_prensa_token");
      localStorage.removeItem("nora_prensa_role");
    }
    router.push("/login");
  };

  const isActive = (path: string) => {
    if (path === "/admin") return pathname === "/admin";
    return pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 relative">
      {/* Sidebar Desktop */}
      <AdminSidebar userRole={role} onLogout={handleLogout} />

      {/* Main Content Area */}
      <main className="flex-1 p-3 md:p-6 pb-24 md:pb-6 overflow-y-auto max-h-screen hide-scrollbar">
        
        {/* Top Header Bar para Celulares y Tablets */}
        <div className="md:hidden flex items-center justify-between p-3.5 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl mb-4 sticky top-0 z-30 shadow-lg">
          
          {/* Botón Menú Hamburguesa */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
              title="Abrir Menú de Navegación"
            >
              <Menu className="w-5 h-5 text-orange-400" />
            </button>
            
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center font-black text-white text-[11px] shadow">
                N1
              </div>
              <span className="font-serif font-black text-xs uppercase tracking-wider text-white">
                Prensa N1
              </span>
            </div>
          </div>

          {/* Accesos Rápidos Top */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsNoraMovilModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm"
              title="Descargar / Acceder a Nora Periodista de Exteriores"
            >
              <Smartphone className="w-3.5 h-3.5 text-orange-400" />
              <span>Nora Móvil</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Page Container */}
        <div className="glass-panel p-3 md:p-8 min-h-[calc(100vh-48px)]">
          {children}
        </div>
      </main>

      {/* Drawer / Menú Desplegable Lateral para Móviles */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop oscuro */}
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Panel Lateral Drawer */}
          <div className="relative w-80 max-w-[85vw] bg-slate-950 border-r border-white/10 h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center font-black text-white text-xs shadow-md">
                  N1
                </div>
                <div>
                  <span className="font-serif font-black text-xs uppercase tracking-wider text-white block">
                    Prensa NexoraOne
                  </span>
                  <span className="text-[10px] text-orange-400 font-mono">Cadena 4 • Enlace Oficial</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <AdminSidebar 
                userRole={role} 
                onLogout={handleLogout} 
                isMobile={true} 
                onClose={() => setIsMobileDrawerOpen(false)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Barra de Navegación Inferior Fija para Móviles (Thumb Navigation) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-white/10 px-2 py-2 flex items-center justify-around shadow-2xl">
        <Link
          href="/admin"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
            isActive("/admin") && pathname === "/admin"
              ? "text-orange-400 font-bold bg-orange-500/10"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span className="text-[10px]">Mesa</span>
        </Link>

        <Link
          href="/admin/editor"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
            isActive("/admin/editor")
              ? "text-orange-400 font-bold bg-orange-500/10"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span className="text-[10px]">Redactor</span>
        </Link>

        <Link
          href="/admin/live"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
            isActive("/admin/live")
              ? "text-red-400 font-bold bg-red-500/10"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Radio className="w-4 h-4" />
          <span className="text-[10px]">En Vivo</span>
        </Link>

        <Link
          href="/admin/corresponsal"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
            isActive("/admin/corresponsal")
              ? "text-emerald-400 font-bold bg-emerald-500/10"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span className="text-[10px]">Calle</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-slate-400 hover:text-white transition-colors"
        >
          <Menu className="w-4 h-4 text-orange-400" />
          <span className="text-[10px]">Menú</span>
        </button>
      </nav>

      {/* Cartel de instalación como app (Android: botón Instalar / iPhone: guía de 2 toques) */}
      <InstallAppPrompt
        appName="Prensa N1"
        tagline="Panel de Redacción • Cadena 4"
        storageKey="prensa_panel"
      />

      {/* Modal QR Nora Periodista de Exteriores */}
      <NoraMovilModal
        isOpen={isNoraMovilModalOpen}
        onClose={() => setIsNoraMovilModalOpen(false)}
      />
    </div>
  );
}
