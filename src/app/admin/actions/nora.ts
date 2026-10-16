"use server";

import { getGroqClient, GROQ_MODELS } from "@/lib/groq";
import { generateContentWithGeminiFallback } from "@/lib/gemini";
import { getDynamicEditorialContext } from "@/lib/memory";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface NoraActionResult {
  success: boolean;
  text?: string;
  newTitle?: string;
  newContent?: string;
  imagePrompt?: string;
  error?: string;
}

export async function getBrandGuidelines(): Promise<string> {
  try {
    const { data } = await supabaseAdmin.from("settings").select("value").eq("key", "brand_guidelines").maybeSingle();
    return data?.value || "";
  } catch (e) {
    return "";
  }
}

export async function fetchBrandGuidelines(): Promise<string> {
  return await getBrandGuidelines();
}

export async function saveBrandGuidelines(content: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.from("settings").upsert({ key: "brand_guidelines", value: content });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

/**
 * Motor Autónomo Híbrido Resiliente de Nora AI (Prensa NexoraOne)
 * Tono: Estricto Español Neutro Latino Internacional (Conductora Internacional / Recepcionista 5 Estrellas).
 * Primario: Groq LPU (Llama 3.3 70B)
 * Secundario: Gemini Multi-Key Cascada de Alta Resiliencia
 */
async function dispatchToNoraAI(
  userPromptText: string,
  systemPromptText: string = "",
  forceJson: boolean = false
): Promise<string> {
  const editorialContext = await getDynamicEditorialContext().catch(() => "");

  const finalSystemInstruction = `
Eres NORA, la Redactora Jefa y Asistente Editorial de Prensa NexoraOne.
Firma y Propiedad: Nexora One © Todos los derechos reservados.

DIRECTIVAS INQUEBRANTABLES DE TONO Y ESTILO:
1. IDIOMA Y TONO: Hablas y redactas estrictamente en ESPAÑOL NEUTRO LATINO de alta gama. Imagina la distinción, precisión, calidez y cortesía de una recepcionista jefa de un hotel 5 estrellas o una conductora de noticiero internacional (estilo CNN en Español o BBC Mundo).
2. CERO MODISMOS LOCALES: Quedan terminantemente prohibidos modismos o giros regionales (NO uses "che", "mirá", "dale", "viste", "boludo", "copado", etc.). Tu lenguaje debe ser universal, transparente, respetuoso y de prestigio.
3. ESTRUCTURA PERIODÍSTICA: Usa el formato de pirámide invertida y resguardo legal impecable ("presunto", "bajo investigación", "se habrían producido").

${editorialContext}

${systemPromptText}
${forceJson ? "\nDEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO. SIN TEXTO EXTRA NI BLOQUES DE CÓDIGO." : ""}
`;

  // 1. Intento Primario: Groq LPU (Llama 3.3 70B)
  const groq = getGroqClient();
  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        model: GROQ_MODELS.text,
        messages: [
          { role: "system", content: finalSystemInstruction },
          { role: "user", content: userPromptText },
        ],
        temperature: forceJson ? 0.2 : 0.5,
        max_tokens: 1800,
        ...(forceJson ? { response_format: { type: "json_object" } } : {}),
      });

      const responseText = completion.choices[0]?.message?.content?.trim();
      if (responseText && responseText.length > 0) {
        return responseText;
      }
    } catch (groqErr: any) {
      console.warn("[Nora AI Cascade] Groq falló o tuvo timeout, conmutando a Gemini Multi-Key:", groqErr?.message);
    }
  }

  // 2. Intento Secundario: Gemini Multi-Key Fallback
  try {
    const geminiText = await generateContentWithGeminiFallback(
      [{ text: `INSTRUCCIÓN DEL SISTEMA:\n${finalSystemInstruction}\n\nPETICIÓN:\n${userPromptText}` }]
    );
    return geminiText;
  } catch (geminiErr: any) {
    console.error("[Nora AI Cascade] Fallaron todos los motores de nube:", geminiErr);
    throw new Error("Estimado editor: He experimentado una interrupción temporal de red en los motores principales. Por favor intente nuevamente en unos instantes.");
  }
}

export async function askNoraEditor(
  title: string, 
  content: string, 
  operatorName: string = "Estimado colega"
): Promise<NoraActionResult> {
  try {
    const guidelines = await getBrandGuidelines();
    const systemPrompt = `
Actúas como Redactora Jefa y Editora Senior de Noticias.
Dirígete al colega por su nombre: ${operatorName}.
Analiza y perfecciona la noticia con lenguaje neutro latino de alta gama y formato de pirámide invertida.
${guidelines ? `\nGuías de estilo aprendidas:\n${guidelines}` : ""}

Devuelve estrictamente un JSON con esta estructura:
{
  "htmlForPanel": "<p>Estimado/a ${operatorName}: He revisado el despacho y realizado las siguientes mejoras...</p>",
  "newTitle": "Titular de alto impacto informativo y neutral",
  "newContent": "<p>Cuerpo completo y redactado con precisión periodística en HTML limpio.</p>"
}
`;

    const userPrompt = `Revisa y pule este despacho informativo:\nTITULAR: ${title}\nCONTENIDO: ${content}`;
    const rawRes = await dispatchToNoraAI(userPrompt, systemPrompt, true);
    const cleaned = rawRes.replace(/```json/gi, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    return {
      success: true,
      text: parsed.htmlForPanel || `<p>${cleaned}</p>`,
      newTitle: parsed.newTitle || title,
      newContent: parsed.newContent || content,
    };
  } catch (err: any) {
    console.error("[askNoraEditor Error]", err);
    return {
      success: false,
      error: err?.message || "Ocurrió un error al procesar el despacho con Nora.",
    };
  }
}

export async function askNoraCM(
  title: string, 
  content: string, 
  operatorName: string = "Estimado colega"
): Promise<NoraActionResult> {
  try {
    const guidelines = await getBrandGuidelines();
    const systemPrompt = `
Actúas como Estratega de Redes Sociales y Difusión de Prensa NexoraOne.
Dirígete al colega: ${operatorName}.
Genera copys atractivos y profesionales para Instagram, Facebook, Telegram y WhatsApp sin modismos regionales.
Devuelve el resultado en HTML limpio para el panel.
${guidelines ? `\nGuías de estilo aprendidas:\n${guidelines}` : ""}
`;
    const userPrompt = `Crea la estrategia de distribución en redes sociales para:\nTITULAR: ${title}\nCONTENIDO: ${content}`;
    const text = await dispatchToNoraAI(userPrompt, systemPrompt, false);
    return {
      success: true,
      text,
    };
  } catch (err: any) {
    console.error("[askNoraCM Error]", err);
    return {
      success: false,
      error: err?.message || "No se pudo generar el contenido para redes.",
    };
  }
}

export async function askNoraSupport(
  query: string, 
  operatorName: string = "Estimado colega"
): Promise<NoraActionResult> {
  try {
    const systemPrompt = `
Actúas como Asesora Técnica y Asistente de Operaciones de Prensa NexoraOne.
Dirígete a: ${operatorName}. Resuelve con amabilidad y claridad consultas sobre el sistema periodístico.
`;
    const text = await dispatchToNoraAI(`Consulta del operador:\n${query}`, systemPrompt, false);
    return {
      success: true,
      text,
    };
  } catch (err: any) {
    console.error("[askNoraSupport Error]", err);
    return {
      success: false,
      error: err?.message || "No se pudo resolver la consulta técnica.",
    };
  }
}

export async function askNoraMarketing(
  title: string, 
  content: string, 
  operatorName: string = "Estimado colega"
): Promise<NoraActionResult> {
  try {
    const systemPrompt = `
Actúas como Directora de Comunicación y Alianzas de Prensa NexoraOne.
Genera un kit de difusión institucional o comunicado formal.
Devuelve estrictamente un JSON con:
{
  "htmlForPanel": "<p>Estrategia de comunicación...</p>",
  "newTitle": "Título del comunicado",
  "newContent": "Texto del comunicado formal",
  "imagePrompt": "Detailed commercial editorial photograph..."
}
`;
    const userPrompt = `Genera la estrategia para:\nCAMPAÑA: ${title}\nBASE: ${content}`;
    const rawRes = await dispatchToNoraAI(userPrompt, systemPrompt, true);
    const cleaned = rawRes.replace(/```json/gi, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    return {
      success: true,
      text: parsed.htmlForPanel || `<p>${cleaned}</p>`,
      newTitle: parsed.newTitle || title,
      newContent: parsed.newContent || content,
      imagePrompt: parsed.imagePrompt || "",
    };
  } catch (err: any) {
    console.error("[askNoraMarketing Error]", err);
    return {
      success: false,
      error: err?.message || "Error al procesar la estrategia de marketing.",
    };
  }
}
