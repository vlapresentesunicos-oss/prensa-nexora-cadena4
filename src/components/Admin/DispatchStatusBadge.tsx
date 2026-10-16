"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Clock, Globe } from "lucide-react";

interface DispatchStatusBadgeProps {
  status: "success" | "failed" | "pending" | "none";
  channelName: string;
}

export default function DispatchStatusBadge({ status, channelName }: DispatchStatusBadgeProps) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        {channelName}: Sincronizado
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
        <AlertCircle className="w-3 h-3" />
        {channelName}: Falló
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3 animate-spin" />
        {channelName}: Enviando
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-slate-400 border border-white/10">
      <Globe className="w-3 h-3" />
      {channelName}
    </span>
  );
}
