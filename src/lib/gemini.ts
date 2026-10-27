import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiCandidateKeys(): string[] {
  return Array.from(
    new Set([
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_FALLBACK,
      process.env.GEMINI_API_KEY_FALLBACK_2,
      process.env.GEMINI_API_KEY_TERTIARY,
    ].filter(Boolean) as string[])
  );
}

export const GEMINI_CANDIDATE_MODELS = Array.from(
  new Set([
    process.env.GEMINI_MODEL || "gemini-3.8-flash",
    "gemini-3.8-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ].filter(Boolean) as string[])
);

export async function generateContentWithGeminiFallback(
  parts: any[],
  systemInstruction?: string
): Promise<string> {
  const keys = getGeminiCandidateKeys();
  if (keys.length === 0) {
    throw new Error("El motor de IA de Nora no está configurado en el servidor.");
  }

  let lastError: any = null;
  const invalidKeys = new Set<string>();

  for (const modelName of GEMINI_CANDIDATE_MODELS) {
    for (const key of keys) {
      if (invalidKeys.has(key)) continue;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const genAI = new GoogleGenerativeAI(key);
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemInstruction ? { role: "system", parts: [{ text: systemInstruction }] } : undefined,
          });

          const result = await model.generateContent(parts);
          const text = result.response.text();
          if (text && text.trim().length > 0) {
            return text.trim();
          }
        } catch (err: any) {
          lastError = err;
          const msg = err?.message || String(err);
          console.warn(`[Gemini Fallback] Modelo ${modelName} falló con llave (intento ${attempt}):`, msg);

          // Si la API key es inválida, no seguir probando esa clave con otros modelos
          if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid") || msg.includes("403")) {
            invalidKeys.add(key);
            break;
          }

          if (attempt < 2 && (msg.includes("429") || msg.includes("503"))) {
            await new Promise((res) => setTimeout(res, 400));
          }
        }
      }
    }
  }

  throw lastError || new Error("El motor de IA de Nora no está disponible en este momento. Inténtalo en unos minutos.");
}
