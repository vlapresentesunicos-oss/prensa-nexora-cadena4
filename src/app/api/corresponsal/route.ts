import { NextResponse } from "next/server";
import { getGroqClient, GROQ_MODELS, transcribeAudioWithGroq } from "@/lib/groq";
import { generateContentWithGeminiFallback } from "@/lib/gemini";
import { parseCoordinates, getClosestLocation } from "@/lib/location-db";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getDynamicEditorialContext } from "@/lib/memory";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const draftText = (formData.get("draft_text") as string) || (formData.get("message") as string) || "";
    const operatorId = (formData.get("operator_id") as string) || "movil_calle";
    const corresponsalName = (formData.get("corresponsal_name") as string) || "Corresponsal de Exteriores";
    const isAnonymous = formData.get("is_anonymous") === "true";
    const coordsStr = (formData.get("geolocation_coordinates") as string) || "-27.5973, -56.6874";
    const attachedMediaUrlStr = formData.get("attached_media_url") as string;
    const interviewLanguage = (formData.get("interview_language") as string) || "auto";

    let attachedMediaUrls: string[] = [];
    if (attachedMediaUrlStr) {
      try {
        attachedMediaUrls = JSON.parse(attachedMediaUrlStr);
      } catch (e) {
        attachedMediaUrls = [attachedMediaUrlStr];
      }
    }

    // Procesar audio si viene en el FormData con transcripción políglota
    const audioFile = formData.get("audio") as File | null;
    let transcription = draftText;
    let detectedAudioLang: string | undefined = undefined;

    if (audioFile && audioFile.size > 0) {
      try {
        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
        const stt = await transcribeAudioWithGroq(audioBuffer, audioFile.name || "audio.webm", interviewLanguage);
        if (stt.text) {
          detectedAudioLang = stt.detectedLanguage;
          const langNote = detectedAudioLang && detectedAudioLang !== "spanish" 
            ? ` [Audio detectado en: ${detectedAudioLang}]` 
            : "";
          transcription = transcription ? `${transcription}\n\n[Reporte de audio${langNote}]: ${stt.text}` : stt.text;
        }
      } catch (audioErr: any) {
        console.warn("[Corresponsal STT] Falló Groq Whisper, continuando con texto directo:", audioErr?.message);
      }
    }

    // Georeferenciación
    const coords = parseCoordinates(coordsStr);
    const closestLoc = getClosestLocation(coords.lat, coords.lng);
    const locationContext = closestLoc
      ? `Ubicación detectada: Cerca de ${closestLoc.name} (${closestLoc.description}). Coordenadas: ${coordsStr}.`
      : `Coordenadas geográficas: ${coordsStr}.`;

    const memoryContext = await getDynamicEditorialContext();

    // Redacción cognitiva de doble versión en Español Neutro Latino de Alta Gama
    const prompt = `
Eres NORA, la Redactora Jefa de Prensa NexoraOne.
Firma y Tecnología Oficial: Nexora One © Todos los derechos reservados.

TAREA EDITORIAL:
Procesa este reporte de corresponsalía de exteriores y genera exactamente DOS versiones periodísticas independientes en ESPAÑOL NEUTRO LATINO de alta gama (cero modismos locales, tono formal, elegante y riguroso como una conductora de noticiero internacional).

PROTOCOLO DE ESCUCHA Y TRADUCCIÓN POLÍGLOTA:
- Si el testimonio o entrevista adjunta fue realizada en PORTUGUÉS, INGLÉS o ITALIANO (frecuente en la zona fronteriza y turística), tradúcelo e interprétalo de forma fidedigna al ESPAÑOL NEUTRO.
- Ambas versiones finales deben quedar publicables 100% en ESPAÑOL. Cita las declaraciones traducidas y aclara con rigor: (ej: "«...declaración traducida...», expresó en portugués original").

1. VERSION A (Portal Propio):
   - Título impactante y optimizado para buscadores.
   - Copete (Excerpt) conciso de no más de 160 caracteres.
   - Cuerpo estructurado en HTML simple (<p>, <strong>) en pirámide invertida.
   - 5 palabras clave de etiquetas (tags).

2. VERSION B (Cadena 4 / Socio Sindicado):
   - Redacción 100% reescrita con sintaxis y vocabulario alternativo para lograr 0% duplicación léxica en Google.
   - Título y cuerpo HTML completo.
   - Pie de atribución profesional.

${memoryContext}

DATOS DEL REPORTE:
Corresponsal: ${isAnonymous ? "Reporte Ciudadano Anónimo" : corresponsalName}
${locationContext}
${detectedAudioLang ? `Idioma Detectado en Entrevista: ${detectedAudioLang}` : ""}
Material informativo:
"${transcription || "Reporte visual y fotográfico desde el lugar de los hechos."}"

FORMATO ESTRICTO DE RESPUESTA JSON (sin markdown ni etiquetas adicionales):
{
  "version_nexativa": {
    "title": "Título Versión Portal",
    "excerpt": "Copete corto...",
    "content": "<p>Cuerpo en HTML...</p>",
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
  },
  "version_partner": {
    "title": "Título Alternativo Cadena 4",
    "content": "<p>Cuerpo reescrito para Cadena 4...</p>",
    "attribution_footer": "Cobertura en exteriores por gentileza de Cadena 4 & Prensa NexoraOne"
  }
}
`;

    let versionNexativa: any = null;
    let versionPartner: any = null;

    // Intento con Groq LPU
    const groq = getGroqClient();
    if (groq) {
      try {
        const comp = await groq.chat.completions.create({
          model: GROQ_MODELS.text,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.3,
        });
        const parsed = JSON.parse(comp.choices[0]?.message?.content || "{}");
        versionNexativa = parsed.version_nexativa;
        versionPartner = parsed.version_partner;
      } catch (e) {
        console.warn("[Corresponsal API] Falló Groq, recurriendo a Gemini Multi-Key");
      }
    }

    if (!versionNexativa || !versionPartner) {
      try {
        const geminiRaw = await generateContentWithGeminiFallback([{ text: prompt }]);
        const cleanJson = geminiRaw.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        versionNexativa = parsed.version_nexativa;
        versionPartner = parsed.version_partner;
      } catch (gErr: any) {
        versionNexativa = {
          title: `Reporte en Exteriores: ${transcription.substring(0, 50)}`,
          excerpt: transcription.substring(0, 150),
          content: `<p>${transcription}</p>`,
          tags: ["Actualidad", "Exteriores", "Cadena 4"],
        };
        versionPartner = {
          title: `Cobertura en Desarrollo: ${transcription.substring(0, 50)}`,
          content: `<p>${transcription}</p>`,
          attribution_footer: "Cobertura oficial por Cadena 4",
        };
      }
    }

    // Insertar en la cola de staging
    const { data: inserted, error: dbError } = await supabaseAdmin
      .from("editorial_staging_queue")
      .insert([
        {
          operator_id: operatorId,
          corresponsal_name: corresponsalName,
          is_anonymous: isAnonymous,
          raw_metadata_title: versionNexativa.title,
          geolocation_coordinates: coordsStr,
          attached_media_url: attachedMediaUrls,
          audio_url: null,
          status: "PENDING_REVIEW",
          transcription,
          version_nexativa: versionNexativa,
          version_partner: versionPartner,
        },
      ])
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Reporte recibido y procesado en cola de staging",
      id: inserted.id,
      item: inserted,
      detectedLanguage: detectedAudioLang
    });
  } catch (err: any) {
    console.error("[Corresponsal Route Error]:", err);
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
