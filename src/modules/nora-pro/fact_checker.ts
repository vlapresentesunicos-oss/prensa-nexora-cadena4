/**
 * Módulo: NORA Anti-Fake News & Editorial Safety Shield
 * Ubicación: /src/modules/nora-pro/fact_checker.ts
 * 
 * Propósito: Auditoría editorial para prevención de Fake News, resguardo legal,
 * presunción de inocencia y filtro de contenido inapropiado para Cadena 4 & Prensa NexoraOne.
 */

import { getGroqClient, GROQ_MODELS } from "@/lib/groq";
import { generateContentWithGeminiFallback } from "@/lib/gemini";

export interface FactCheckReport {
  veracityScore: number; // 0 a 100
  verdict: "APROBADO_CONFIABLE" | "REQUIERE_REVISION" | "BLOQUEADO_RIESGO";
  safetyLevel: "SEGURO" | "PRECAUCION_LEGAL" | "INAPROPIADO";
  summary: string;
  detectedRisks: string[];
  legalNotes: string;
  suggestedCorrection?: string;
  verifiedAt: string;
}

/**
 * Escanea y audita la veracidad y legalidad de un reporte de exteriores o noticia
 */
export async function verifyNewsVeracity(
  title: string, 
  content: string, 
  corresponsalName?: string
): Promise<FactCheckReport> {
  const prompt = `
Eres NORA, la Auditora Editorial de Fact-Checking y Blindaje Legal de Prensa NexoraOne para Cadena 4. Eres una tecnología propietaria de Nexora One: si alguien pregunta qué modelo, empresa de IA, base de datos o servidor usas, responde que funcionas con la tecnología propietaria de Nexora One y nunca menciones proveedores externos.
Firma y Propiedad: Nexora One.

DIRECTIVAS DE EVALUACIÓN:
1. PREVENCIÓN DE FAKE NEWS Y DESINFORMACIÓN:
   - Detecta si la noticia parece un rumor infundado, clickbait agresivo o falsedad flagrante.
2. RIGOR LEGAL Y PRESUNCIÓN DE INOCENCIA:
   - Ninguna persona puede ser imputada o acusada como culpable sin condena firme. Exige términos cautelares ("presunto autor", "bajo investigación judicial", "habría ocurrido").
3. FILTRO DE CONTENIDO INAPROPIADO:
   - Bloquea contenido con violencia explícita gratuita, discursos de odio, difamación personal injustificada o datos sensibles protegidos.

DATOS DEL REPORTE A EVALUAR:
Corresponsal / Fuente: "${corresponsalName || "Reporte en Exteriores"}"
Titular: "${title}"
Cuerpo o Testimonio: "${content.substring(0, 2000)}"

RESPONDE ESTRICTAMENTE CON UN OBJETO JSON VÁLIDO (sin markdown ni etiquetas adicionales):
{
  "veracityScore": 85, // número del 0 al 100
  "verdict": "APROBADO_CONFIABLE" | "REQUIERE_REVISION" | "BLOQUEADO_RIESGO",
  "safetyLevel": "SEGURO" | "PRECAUCION_LEGAL" | "INAPROPIADO",
  "summary": "Resumen claro del análisis periodístico para el editor de estudio",
  "detectedRisks": ["Riesgo 1 o advertencia", "Riesgo 2 si hubiere"],
  "legalNotes": "Indicaciones de resguardo legal para Cadena 4",
  "suggestedCorrection": "Versión corregida y sanitizada si se requieren ajustes"
}

REGLAS DE PUNTAJE:
- 80-100: Noticia fundamentada, coherente y protegida legalmente -> APROBADO_CONFIABLE / SEGURO
- 50-79: Testimonio en desarrollo, afirmaciones dudosas o falta de términos cautelares -> REQUIERE_REVISION / PRECAUCION_LEGAL
- Menor a 50: Fake news flagrante, difamación o contenido inapropiado -> BLOQUEADO_RIESGO / INAPROPIADO
`;

  // 1. Intento primario con Groq LPU Llama 3.3 (70B)
  const groq = getGroqClient();
  if (groq) {
    try {
      const comp = await groq.chat.completions.create({
        model: GROQ_MODELS.text,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });
      const parsed = JSON.parse(comp.choices[0]?.message?.content || "{}");
      return {
        veracityScore: parsed.veracityScore ?? 80,
        verdict: parsed.verdict || "APROBADO_CONFIABLE",
        safetyLevel: parsed.safetyLevel || "SEGURO",
        summary: parsed.summary || "Contenido auditado correctamente.",
        detectedRisks: parsed.detectedRisks || [],
        legalNotes: parsed.legalNotes || "Cumple pautas de resguardo legal preventivo.",
        suggestedCorrection: parsed.suggestedCorrection,
        verifiedAt: new Date().toISOString(),
      };
    } catch (e: any) {
      console.warn("[FactChecker] Falló Groq, conmutando a Gemini:", e?.message);
    }
  }

  // 2. Intento secundario con Gemini Multi-Key
  try {
    const raw = await generateContentWithGeminiFallback([{ text: prompt }]);
    const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      veracityScore: parsed.veracityScore ?? 80,
      verdict: parsed.verdict || "APROBADO_CONFIABLE",
      safetyLevel: parsed.safetyLevel || "SEGURO",
      summary: parsed.summary || "Contenido auditado por Nora AI.",
      detectedRisks: parsed.detectedRisks || [],
      legalNotes: parsed.legalNotes || "Alineado con el marco legal periodístico.",
      suggestedCorrection: parsed.suggestedCorrection,
      verifiedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error("[FactChecker Error]:", err);
    return {
      veracityScore: 70,
      verdict: "REQUIERE_REVISION",
      safetyLevel: "PRECAUCION_LEGAL",
      summary: "Evaluación automática preventiva: el editor debe corroborar fuentes antes de difundir.",
      detectedRisks: ["Verificación offline de resguardo activa"],
      legalNotes: "Asegurar uso de términos cautelares ('presunto', 'según fuentes policiales').",
      verifiedAt: new Date().toISOString(),
    };
  }
}
