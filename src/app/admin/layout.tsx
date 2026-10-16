"use client";

import React, { useEffect, useState } from "react";
import AdminSidebar from "@/components/Admin/AdminSidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Radio, Share2, LogOut } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = useState("Director");

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

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 relative">
      {/* Sidebar Colapsable en Desktop */}
      <AdminSidebar userRole={role} onLogout={handleLogout} />

      {/* Main Content Area */}
      <main className="flex-1 p-3 md:p-6 overflow-y-auto max-h-screen hide-scrollbar">
        {/* Mobile Header Bar */}
        <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border border-white/10 rounded-2xl mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-red-600 flex items-center justify-center font-black text-white text-xs">
              N1
            </div>
            <span className="font-serif font-black text-xs uppercase tracking-wider text-white">
              Prensa NexoraOne
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/live"
              className="px-2.5 py-1 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
            >
              <Radio className="w-3 h-3 animate-pulse" /> En Vivo
            </Link>
            <button
              onClick={handleLogout}
              className="p-1 rounded-lg text-slate-400 hover:text-red-400"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Page Container */}
        <div className="glass-panel p-4 md:p-8 min-h-[calc(100vh-48px)]">
          {children}
        </div>
      </main>
    </div>
  );
}
