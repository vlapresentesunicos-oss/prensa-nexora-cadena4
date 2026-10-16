/***
 * Pipeline de Tiempo Real: Scraper Nativo Serverless a costo cero
 * Extrae titulares y eventos de portales abiertos y feeds RSS sin dependencias pagas.
 */

export interface ScrapedNewsItem {
  title: string;
  source?: string;
  pubDate?: string;
  description?: string;
  link?: string;
}

const SOURCES: Record<string, string[]> = {
  noticias_corrientes: [
    "https://www.ellitoral.com.ar/rss/feed.xml",
    "https://www.diarioellibertador.com.ar/feed/",
  ],
  noticias_nacionales: [
    "https://www.clarin.com/rss/lo-ultimo/",
    "https://tn.com.ar/feed/",
    "https://www.infobae.com/arc/outboundfeeds/rss/?outputType=xml",
  ],
};

function cleanCdata(text: string): string {
  if (!text) return "";
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchLiveNewsContext(category: "corrientes" | "nacionales" = "corrientes"): Promise<string> {
  const feeds = category === "corrientes" ? SOURCES.noticias_corrientes : SOURCES.noticias_nacionales;
  const items: string[] = [];

  for (const url of feeds) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal, next: { revalidate: 600 } });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const itemMatches = Array.from(text.matchAll(/<item>([\s\S]*?)<\/item>/gi)).slice(0, 4);

        for (const match of itemMatches) {
          const itemXml = match[1];
          const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            const cleanTitle = cleanCdata(titleMatch[1]);
            if (cleanTitle) items.push(cleanTitle);
          }
        }
      }
    } catch (err) {
      // Ignorar fallos de feeds individuales silenciosamente
    }
  }

  if (items.length === 0) return "";
  return `\n[TITULARES RECIENTES DE REFERENCIA EN CORRIENTES / ARGENTINA]:\n- ${items.join("\n- ")}\n`;
}
