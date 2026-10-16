import { Groq } from "groq-sdk";

export function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

export const GROQ_MODELS = {
  text: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  fast: "llama-3.1-8b-instant",
  whisper: process.env.GROQ_WHISPER_MODEL || "whisper-large-v3"
};

export interface TranscriptionResult {
  text: string;
  detectedLanguage?: string;
}

/**
 * Transcribe audio con Groq Whisper Large v3 con soporte políglota nativo:
 * Español, Portugués, Inglés, Italiano y detección automática (99+ idiomas).
 */
export async function transcribeAudioWithGroq(
  fileBlob: Blob | Buffer, 
  filename: string = "audio.webm",
  targetLanguage?: string
): Promise<TranscriptionResult> {
  const groq = getGroqClient();
  if (!groq) throw new Error("El servicio de transcripción de audio de Nora no está configurado.");

  const file = fileBlob instanceof Blob 
    ? new File([fileBlob], filename, { type: fileBlob.type || "audio/webm" })
    : new File([fileBlob as any], filename, { type: "audio/webm" });

  const options: any = {
    file: file as any,
    model: GROQ_MODELS.whisper,
    response_format: "verbose_json",
    temperature: 0.1,
  };

  // Si el operador seleccionó un idioma específico (es, pt, en, it), lo forzamos.
  // Si no (o si es 'auto'), dejamos que Whisper auto-detecte el idioma nativo de la entrevista.
  if (targetLanguage && targetLanguage !== "auto") {
    options.language = targetLanguage;
  }

  const transcription: any = await groq.audio.transcriptions.create(options);

  return {
    text: (transcription.text || "").trim(),
    detectedLanguage: transcription.language || undefined,
  };
}
