import { getGlobalLearningSummary, recordLearnedInsight, updateLearningSummary, NoraLearnedInsight } from "./mongodb";

export async function getDynamicEditorialContext(): Promise<string> {
  const summary = await getGlobalLearningSummary("nora-prensa");
  if (!summary) {
    return `
[MEMORIA EDITORIAL ACUMULADA]:
- Medio Principal: Cadena 4 (Ituzaingó, Corrientes).
- Tono: Español Neutro Latino de Alta Gama. Cero regionalismos o modismos locales (evitar "che", "mirá", "dale", "viste").
- Estructura: Formato pirámide invertida (Qué, Quién, Cuándo, Dónde, Por qué, Cómo).
- Resguardo Legal: Lenguaje riguroso con términos preventivos ("presunto", "bajo investigación", "se habrían producido").
`;
  }

  return `
[MEMORIA EDITORIAL ACUMULADA Y APRENDIZAJES PREVIOS]:
${summary}
`;
}

export async function learnFromEditorCorrection(
  originalDraft: string,
  editedDraft: string,
  title: string,
  category: string
): Promise<void> {
  if (!originalDraft || !editedDraft || originalDraft === editedDraft) return;

  const insight: NoraLearnedInsight = {
    topic: `Edición de noticia: ${title.substring(0, 40)}`,
    insight: `El editor corrigió el texto original. Se priorizaron términos más concisos y ajustes en la estructura de ${category}.`,
    category: "corrections",
    createdAt: new Date().toISOString(),
    sourceContext: `Categoría: ${category} | Título: ${title}`,
  };

  await recordLearnedInsight(insight, "nora-prensa");
}
