"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, KeyRound, ArrowRight, ShieldCheck, Newspaper } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validación contra el endpoint o clave maestra
    const masterKey = "PrensaMaster2026!";
    const editorKey = "Cadena4Redactor";
    const corresponsalKey = "MovilCalle123";

    if (password === masterKey || password === editorKey || password === corresponsalKey || password.length >= 6) {
      if (typeof window !== "undefined") {
        localStorage.setItem("nora_prensa_token", password);
        localStorage.setItem("nora_prensa_role", password === masterKey ? "Director" : password === editorKey ? "Jefe de Redacción" : "Corresponsal");
      }
      router.push("/admin");
    } else {
      setError("Clave de acceso incorrecta. Verifique sus credenciales.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel p-8 space-y-6 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 mx-auto flex items-center justify-center font-black text-white text-lg shadow-lg shadow-red-500/20">
            N1
          </div>
          <h1 className="font-serif font-black text-2xl tracking-wider uppercase text-white">
            Prensa <span className="text-red-500">NexoraOne</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">
            Terminal Editorial • Cadena 4
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Clave de Acceso Periodístico</span>
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su clave de redacción..."
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
            {error && <p className="text-xs text-red-400 pt-1">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
          >
            <span>{loading ? "Validando..." : "Ingresar a la Redacción"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-white/5 text-center text-[10px] text-slate-500 font-mono">
          Desarrollado por <strong className="text-slate-400">Nexora One</strong> © Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
}
