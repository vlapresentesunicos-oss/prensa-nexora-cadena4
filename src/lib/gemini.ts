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

export const GEMINI_CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL || "gemini-2.5-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash"
];

export async function generateContentWithGeminiFallback(
  parts: any[],
  systemInstruction?: string
): Promise<string> {
  const keys = getGeminiCandidateKeys();
  if (keys.length === 0) {
    throw new Error("El motor de IA de Nora no está configurado en el servidor.");
  }

  let lastError: any = null;

  for (const modelName of GEMINI_CANDIDATE_MODELS) {
    for (const key of keys) {
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
          console.warn(`[Gemini Fallback] Modelo ${modelName} falló con llave (intento ${attempt}):`, err?.message || err);
          if (attempt < 2 && (err?.message?.includes("429") || err?.message?.includes("503"))) {
            await new Promise((res) => setTimeout(res, 600));
          }
        }
      }
    }
  }

  throw lastError || new Error("El motor de IA de Nora no está disponible en este momento. Inténtalo en unos minutos.");
}
