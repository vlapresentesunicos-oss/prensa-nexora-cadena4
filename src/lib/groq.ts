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

export async function transcribeAudioWithGroq(fileBlob: Blob | Buffer, filename: string = "audio.webm"): Promise<string> {
  const groq = getGroqClient();
  if (!groq) throw new Error("GROQ_API_KEY no configurada");

  const file = fileBlob instanceof Blob 
    ? new File([fileBlob], filename, { type: fileBlob.type || "audio/webm" })
    : new File([fileBlob as any], filename, { type: "audio/webm" });

  const transcription = await groq.audio.transcriptions.create({
    file: file as any,
    model: GROQ_MODELS.whisper,
    language: "es",
    response_format: "json",
    temperature: 0.1,
  });

  return (transcription.text || "").trim();
}
