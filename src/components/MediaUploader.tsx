"use client";

import React, { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface MediaUploaderProps {
  onUploadSuccess: (url: string) => void;
  accept?: string;
  label?: string;
}

export default function MediaUploader({ onUploadSuccess, accept = "image/*,video/*", label = "Subir Archivo" }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const supabase = getSupabaseBrowserClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('media').getPublicUrl(filePath);
      
      onUploadSuccess(data.publicUrl);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      alert("Error subiendo el archivo. Asegúrate de tener el bucket 'media' creado y público en Supabase.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-bold text-[var(--color-brand-accent)]">{label}</label>
      <div className="flex items-center gap-4">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading}
          className="text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all cursor-pointer"
        />
        {uploading && <span className="text-xs text-yellow-400 animate-pulse">Subiendo...</span>}
      </div>
    </div>
  );
}
