import { NextResponse } from "next/server";
import { getGroqClient, GROQ_MODELS, transcribeAudioWithGroq } from "@/lib/groq";
import { generateContentWithGeminiFallback } from "@/lib/gemini";
import { getDynamicEditorialContext } from "@/lib/memory";

export const maxDuration = 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const { message, currentDraft, image, audio, video, image_url, audio_url, video_url } = await request.json();

    if (!message && !image && !audio && !video && !image_url && !audio_url && !video_url) {
      return NextResponse.json(
        { error: "No se proporcionó información (se requiere mensaje, imagen, audio o video)." },
        { status: 400, headers: corsHeaders }
      );
    }

    const editorialMemory = await getDynamicEditorialContext();

    // 1. Si hay audio, transcribir primero con Groq Whisper (ultra-rápido en 400ms)
    let audioTranscript = "";
    if (audio) {
      try {
        const audioBase64 = audio.includes(",") ? audio.split(",")[1] : audio;
        const audioBuffer = Buffer.from(audioBase64, "base64");
        audioTranscript = await transcribeAudioWithGroq(audioBuffer, "reporte_voz.webm");
      } catch (err: any) {
        console.warn("[Nora Live] Groq Whisper falló, recurriendo a Gemini audio:", err?.message);
      }
    } else if (audio_url) {
      try {
        const aRes = await fetch(audio_url);
        if (aRes.ok) {
          const aBuf = await aRes.arrayBuffer();
          audioTranscript = await transcribeAudioWithGroq(Buffer.from(aBuf), "reporte_remoto.webm");
        }
      } catch (err) {}
    }

    const promptDirectives = `
Eres NORA, la Redactora Jefa de Prensa NexoraOne.
Firma y Tecnología Oficial: Desarrollado por Nexora One © Todos los derechos reservados.

DIRECTIVAS CENTRALES DE VOZ, TONO Y ESTILO:
1. IDIOMA Y TONO: Hablas y redactas estrictamente en ESPAÑOL NEUTRO LATINO de alta gama. Imagina la distinción, precisión, calidez y cortesía de una recepcionista jefa de un hotel 5 estrellas o una conductora de noticiero internacional (estilo CNN en Español o BBC Mundo).
2. CERO MODISMOS LOCALES: Quedan terminantemente prohibidos modismos o giros regionales (NO uses "che", "mirá", "dale", "viste", "boludo", "copado", etc.). Tu lenguaje debe ser universal, transparente, respetuoso y de prestigio.
3. RIGOR PERIODÍSTICO Y LEGAL: Usa la estructura de pirámide invertida (Qué, Quién, Cuándo, Dónde, Por qué y Cómo). Mantén estricto resguardo legal usando términos preventivos ("presunto", "bajo investigación oficial", "se habrían producido").

${editorialMemory}

CRÍTICO - FORMATO DE RESPUESTA:
Debes responder obligatoriamente con dos secciones delimitadas por etiquetas:

<REPLY>
[Escribe tu respuesta al periodista en tono sumamente profesional, cálido y elegante en Español Neutro Latino. Indícale qué datos se incorporaron y qué testimonios u observaciones adicionales se requieren para cerrar el informe.]
</REPLY>

<DRAFT>
[Escribe el borrador completo, estructurado y actualizado del artículo en formato HTML simple (usa <p>, <strong>), integrando la nueva información de manera fluida y profesional.]
</DRAFT>

---
BORRADOR ANTERIOR:
${currentDraft || "El borrador está vacío actualmente."}

---
NUEVO REPORTE DEL PERIODISTA:
${message ? `Texto: "${message}"` : ""}
${audioTranscript ? `Transcripción de Audio de Voz: "${audioTranscript}"` : ""}
`;

    // 2. Si no hay video ni imagen directa, resolver a la velocidad de la luz con Groq Llama 3.3
    if (!video && !video_url && !image && !image_url) {
      const groq = getGroqClient();
      if (groq) {
        try {
          const completion = await groq.chat.completions.create({
            model: GROQ_MODELS.text,
            messages: [{ role: "user", content: promptDirectives }],
            temperature: 0.4,
            max_tokens: 2000,
          });

          const rawText = completion.choices[0]?.message?.content || "";
          const replyMatch = rawText.match(/<REPLY>([\s\S]*?)<\/REPLY>/i);
          const draftMatch = rawText.match(/<DRAFT>([\s\S]*?)<\/DRAFT>/i);

          return NextResponse.json(
            {
              reply: replyMatch ? replyMatch[1].trim() : "Borrador actualizado con el reporte.",
              newDraft: draftMatch ? draftMatch[1].trim() : rawText,
              provider: "groq-lpu-llama3.3",
            },
            { headers: corsHeaders }
          );
        } catch (groqErr) {
          console.warn("[Nora Live] Falló Groq, conmutando a Gemini Multi-Key");
        }
      }
    }

    // 3. Si hay video, imagen o fallo Groq: Usar Gemini Multi-Key con capacidad de vision y video
    let parts: any[] = [{ text: promptDirectives }];

    if (image) {
      const imgParts = image.split(",");
      if (imgParts.length === 2) {
        const mimeType = imgParts[0].split(":")[1].split(";")[0] || "image/jpeg";
        parts.push({ inlineData: { data: imgParts[1], mimeType } });
      }
    } else if (image_url) {
      try {
        const imgRes = await fetch(image_url);
        if (imgRes.ok) {
          const arrayBuf = await imgRes.arrayBuffer();
          parts.push({
            inlineData: {
              data: Buffer.from(arrayBuf).toString("base64"),
              mimeType: imgRes.headers.get("content-type") || "image/jpeg",
            },
          });
        }
      } catch (e) {}
    }

    if (video) {
      const vidParts = video.split(",");
      if (vidParts.length === 2) {
        const mimeType = vidParts[0].split(":")[1].split(";")[0] || "video/webm";
        parts.push({ inlineData: { data: vidParts[1], mimeType } });
      }
    }

    const geminiRaw = await generateContentWithGeminiFallback(parts);
    const replyMatch = geminiRaw.match(/<REPLY>([\s\S]*?)<\/REPLY>/i);
    const draftMatch = geminiRaw.match(/<DRAFT>([\s\S]*?)<\/DRAFT>/i);

    return NextResponse.json(
      {
        reply: replyMatch ? replyMatch[1].trim() : "Borrador actualizado.",
        newDraft: draftMatch ? draftMatch[1].trim() : geminiRaw,
        provider: "gemini-multimodal-cascade",
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Nora Live Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Error procesando reporte en vivo" },
      { status: 500, headers: corsHeaders }
    );
  }
}
