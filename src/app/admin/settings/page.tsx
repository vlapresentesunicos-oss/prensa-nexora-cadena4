"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Settings, Save, CheckCircle2, ShieldCheck, Radio } from "lucide-react";

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [settings, setSettings] = useState({
    brand_name: "Prensa NexoraOne • Cadena 4",
    client_name: "Cadena 4",
    client_station: "FM 94.5 • Señal Digital & Televisora",
    site_url: "https://cadena4.com.ar",
    editorial_tone: "Español Neutro Latino de Alta Gama",
  });

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from("settings").select("*");
      if (data && data.length > 0) {
        const map: any = {};
        data.forEach((s: any) => {
          map[s.key] = s.value;
        });
        setSettings((prev) => ({ ...prev, ...map }));
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from("settings").upsert(updates);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert("Error guardando ajustes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-2xl md:text-3xl font-serif font-black text-white tracking-widest uppercase flex items-center gap-3">
          <Settings className="w-7 h-7 text-red-500" />
          Ajustes de Marca • <span className="text-red-500">Cadena 4</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Personalización de Emisora, Frecuencias y Política Editorial de Nexora One
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="glass-card p-6 border border-white/10 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Nombre de la Plataforma / Suite
            </label>
            <input
              type="text"
              value={settings.brand_name}
              onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Nombre del Medio Socio
              </label>
              <input
                type="text"
                value={settings.client_name}
                onChange={(e) => setSettings({ ...settings, client_name: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Slogan / Frecuencias de Radio y TV
              </label>
              <input
                type="text"
                value={settings.client_station}
                onChange={(e) => setSettings({ ...settings, client_station: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              URL Oficial del Portal Web
            </label>
            <input
              type="text"
              value={settings.site_url}
              onChange={(e) => setSettings({ ...settings, site_url: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tono Periodístico de Nora IA
            </label>
            <input
              type="text"
              disabled
              value={settings.editorial_tone}
              className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-amber-400 font-bold cursor-not-allowed"
            />
            <p className="text-[10px] text-slate-500">
              * Bloqueado por estándar de calidad: Español Neutro Latino sin modismos regionales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Guardando..." : "Guardar Configuración"}</span>
          </button>

          {success && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> ¡Configuración guardada exitosamente!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
