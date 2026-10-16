import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, urls, videoTitle, rawText, clipType = "mixed" } = body;

    // Support single URL string or array of up to 5 URLs
    let videoUrlsList: string[] = [];
    if (Array.isArray(urls) && urls.length > 0) {
      videoUrlsList = urls.filter(Boolean);
    } else if (typeof url === "string" && url.trim()) {
      videoUrlsList = url.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);
    }

    if (videoUrlsList.length === 0 && !rawText) {
      return NextResponse.json({ error: "Se requiere al menos 1 URL de video de YouTube o transcripción." }, { status: 400, headers: corsHeaders });
    }

    const candidateKeys = Array.from(new Set([
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_FALLBACK,
      process.env.GEMINI_API_KEY_FALLBACK_2,
      process.env.GEMINI_API_KEY_TERTIARY
    ].filter(Boolean))) as string[];

    const primaryModel = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    const candidateModels = Array.from(new Set([primaryModel, "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]));

    const isMultiVideo = videoUrlsList.length > 1;

    const prompt = `Eres NORA, la Redactora Jefa y Productora Audiovisual de la Cadena de Noticias Cadena 4 • Prensa NexoraOne.
Tu trabajo es analizar ${isMultiVideo ? `un LOTE de ${videoUrlsList.length} transmisiones/programas periodísticos del día` : "un video/evento periodístico"} y extraer:
1. MEJORES CLIPS DE VIDEO CORTOS (30s - 90s) para Reels / Shorts.
2. PROPUESTA DE FLASH DE NOTICIAS (1 a 5 minutos) combinando los momentos clave de mayor impacto periodístico ${isMultiVideo ? "de los distintos programas procesados" : ""}.

URLs de Videos/Programas:
${videoUrlsList.map((u, i) => `• Programa ${i + 1}: ${u}`).join("\n")}

Título/Contexto General: ${videoTitle || "Coberturas y Noticieros del Día"}
Contenido/Transcripción disponible: ${rawText || "Analizar el contenido de los enlaces indicados."}
Tipo de Clips solicitados: ${clipType}

INSTRUCCIONES DE EXTRACCIÓN:
Genera un objeto JSON estricto con:
- "video_summary": Síntesis ejecutiva combinada del lote de emisiones en 2 oraciones.
- "total_clips_found": Número total de clips.
- "suggested_news_flash": Objeto con { "title": "...", "summary": "...", "target_duration_seconds": 180, "clip_ids": [1, 2, 3] } para armar el noticiero rápido de 1 a 5 minutos.
- "clips": Lista de entre 3 y 8 clips individuales. Cada uno con:
  - "clip_id": Número (1, 2, 3...)
  - "video_url": La URL exacta del programa de origen al que pertenece este clip.
  - "source_title": "Programa 1", "Programa 2", etc.
  - "title": Titular impactante periodístico.
  - "start_time_seconds": Segundo inicio.
  - "end_time_seconds": Segundo fin.
  - "start_timestamp": "MM:SS" o "HH:MM:SS".
  - "end_timestamp": "MM:SS" o "HH:MM:SS".
  - "duration_seconds": Duración en segundos.
  - "summary": Síntesis periodística.
  - "impact_score": Puntaje 1-10.
  - "category": "política", "local", "nacional", "internacional", "sociedad".
  - "social_caption": Copia lista para redes con hashtags.

FORMATO DE RESPUESTA JSON REQUERIDO:
{
  "video_summary": "...",
  "total_clips_found": 4,
  "suggested_news_flash": {
    "title": "🔴 FLASH DE NOTICIAS: ...",
    "summary": "...",
    "target_duration_seconds": 180,
    "clip_ids": [1, 2, 3]
  },
  "clips": [
    {
      "clip_id": 1,
      "video_url": "${videoUrlsList[0] || ""}",
      "source_title": "Programa 1",
      "title": "...",
      "start_time_seconds": 45,
      "end_time_seconds": 105,
      "start_timestamp": "00:45",
      "end_timestamp": "01:45",
      "duration_seconds": 60,
      "summary": "...",
      "impact_score": 9,
      "category": "nacional",
      "social_caption": "..."
    }
  ]
}

IMPORTANTE: Responde ÚNICAMENTE con el objeto JSON válido.
`;

    let responseText = "";
    let lastError: any = null;

    for (const modelName of candidateModels) {
      if (responseText) break;
      for (const key of candidateKeys) {
        if (responseText) break;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: { responseMimeType: "application/json" }
            });
            const result = await model.generateContent(prompt);
            const res = await result.response;
            responseText = res.text();
            if (responseText) break;
          } catch (err: any) {
            lastError = err;
            console.warn(`[Nora Clip Multi-Video API] Falló ${modelName} (${key.substring(0, 8)}...):`, err.message);
            if (attempt < 2 && (err.message?.includes("503") || err.message?.includes("high demand") || err.message?.includes("429"))) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }
      }
    }

    if (!responseText) {
      throw new Error(`Error en Nora Clipper API: ${lastError?.message || lastError}`);
    }

    let parsedData = JSON.parse(responseText);

    // Fallback: Fill video_url on clips if missing
    if (parsedData && Array.isArray(parsedData.clips)) {
      parsedData.clips = parsedData.clips.map((c: any, idx: number) => ({
        ...c,
        video_url: c.video_url || videoUrlsList[idx % videoUrlsList.length] || videoUrlsList[0],
        source_title: c.source_title || `Programa ${(idx % videoUrlsList.length) + 1}`
      }));
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
      video_urls: videoUrlsList
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("[Nora Clip Multi-Video Error]:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Error procesando el lote de videos."
    }, { status: 500, headers: corsHeaders });
  }
}

