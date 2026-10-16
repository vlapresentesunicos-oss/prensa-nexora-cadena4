import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseAdmin } from "@/lib/supabase/admin";

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

// Feeds automáticos enfocados en Ituzaingó, Corrientes y la Región Litoral
const ITUZAINGO_RSS_FEEDS = [
  'https://news.google.com/rss/search?q=Ituzaing%C3%B3+Corrientes&hl=es-419&gl=AR&ceid=AR:es-419',
  'https://news.google.com/rss/search?q=Yacyret%C3%A1+Ituzaing%C3%B3&hl=es-419&gl=AR&ceid=AR:es-419',
  'https://news.google.com/rss/search?q=Esteros+del+Iber%C3%A1+Corrientes&hl=es-419&gl=AR&ceid=AR:es-419',
  'https://www.ellitoral.com.ar/rss/seccion/corrientes',
];

function cleanCdata(text: string): string {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .trim();
}

function parseRssXml(xmlText: string) {
  const items: any[] = [];
  const itemMatches = Array.from(xmlText.matchAll(/<item>([\s\S]*?)<\/item>/gi));

  for (const match of itemMatches) {
    const itemXml = match[1];

    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
    const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);

    const title = cleanCdata(titleMatch ? titleMatch[1] : '');
    const link = cleanCdata(linkMatch ? linkMatch[1] : '');
    const rawDesc = cleanCdata(descMatch ? descMatch[1] : '');

    if (title && link) {
      let imageUrl = null;
      const imgMatch = rawDesc.match(/<img[^>]+src="([^">]+)"/i);
      if (imgMatch && imgMatch[1]) {
        imageUrl = imgMatch[1];
      }

      items.push({
        title,
        link,
        description: rawDesc,
        thumbnail: imageUrl,
      });
    }
  }

  return items;
}

export class NewsGenerator {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_FALLBACK;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Alias de compatibilidad para rotación de noticias
   */
  public async generateNewArticles(count: number = 2): Promise<any[]> {
    return this.generateItuzaingoNews(count);
  }

  /**
   * Genera y reescribe automáticamente noticias locales de Ituzaingó y Corrientes con la voz de Nora AI
   */
  public async generateItuzaingoNews(count: number = 3): Promise<any[]> {
    try {
      const supabase = supabaseAdmin;

      // Cargar URLs existentes para no repetir
      const { data: existingArticles } = await supabase
        .from('articles')
        .select('external_url')
        .not('external_url', 'is', null);

      const existingUrls = new Set((existingArticles || []).map((a: any) => a.external_url));
      const collectedItems: any[] = [];

      for (const rssUrl of ITUZAINGO_RSS_FEEDS) {
        try {
          const res = await fetch(rssUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            },
            cache: 'no-store',
          });

          if (res.ok) {
            const xmlText = await res.text();
            const items = parseRssXml(xmlText);
            for (const item of items) {
              if (item.link && !existingUrls.has(item.link)) {
                collectedItems.push(item);
              }
            }
          }
        } catch (fErr) {}
      }

      if (collectedItems.length === 0) return [];

      const itemsToProcess = collectedItems.slice(0, count);
      const generatedArticles = [];

      for (const item of itemsToProcess) {
        const article = await this.rewriteArticleWithNora(item);
        if (article) {
          generatedArticles.push(article);
        }
      }

      return generatedArticles;
    } catch (error) {
      console.error("[Nora News Generator] Error en generación de noticias de Ituzaingó:", error);
      return [];
    }
  }

  /**
   * Procesa la novedad con Nora AI (Gemini) adaptándola al tono local de Ituzaingó y generando copy para redes
   */
  private async rewriteArticleWithNora(item: any): Promise<any | null> {
    const rawContent = item.description || "";
    const title = item.title || "";
    const link = item.link || "";

    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_FALLBACK;

    const defaultImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';

    if (!apiKey) {
      return {
        title,
        excerpt: rawContent.replace(/<[^>]+>/g, '').substring(0, 160) + "...",
        content: `<p>${rawContent}</p><p><i>Fuente local: <a href="${link}" target="_blank" rel="noopener noreferrer">Leer nota completa aquí</a></i></p>`,
        image_url: item.thumbnail || defaultImage,
        external_url: link,
        category: 'local',
        status: 'published',
        social_copy: `📰 ${title}\n\nConocé los detalles en Nexativa News 👇\n#Ituzaingó #Corrientes #NexativaNews`
      };
    }

    const prompt = `
Eres NORA, la Redactora Jefa y Periodista Digital de Prensa NexoraOne.
Firma: Nexora One.
DIRECTIVA DE TONO: Estricto Español Neutro Latino de alta gama (conducción de noticiero internacional / recepcionista 5 estrellas). Cero modismos regionales.

Tu objetivo es tomar la siguiente novedad periodística de Ituzaingó o la provincia de Corrientes y redactarla con un estilo impecable de periodismo de cercanía, profesional, respetando el "fair use" y agregando interpretación de valor local.

Título original: ${title}
Contenido fuente: ${rawContent.replace(/<[^>]+>/g, '')}

Devuelve la respuesta ESTRICTAMENTE en este formato JSON sin bloques de código markdown:
{
  "newTitle": "Título impactante con enfoque local",
  "excerpt": "Resumen conciso y atrapante de no más de 160 caracteres...",
  "htmlContent": "<p>Primer párrafo introductorio enfocado en la comunidad de Ituzaingó y Corrientes...</p><p>Segundo párrafo con los detalles sustanciales...</p>",
  "socialCopy": "📲 COPY PARA INSTAGRAM/FACEBOOK/X:\\n\\n¡ÚLTIMO MOMENTO EN ITUZAINGÓ! 🌿\\n[Resumen atrapante de 2 líneas]\\n\\n👉 Leé la nota completa en nexativanews.com.ar\\n\\n#Ituzaingó #Corrientes #NexativaNews #Iberá"
}
    `;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const textResponse = result.response.text().trim();
      const cleanedText = textResponse.replace(/^\`\`\`json/m, '').replace(/^\`\`\`/m, '').trim();
      const parsed = JSON.parse(cleanedText);

      const finalHtmlContent = `${parsed.htmlContent}\n\n<p><i>Fuente periodística: <a href="${link}" target="_blank" rel="noopener noreferrer">Leer nota completa en el portal de origen</a></i></p>`;

      return {
        title: parsed.newTitle || title,
        excerpt: parsed.excerpt || title,
        content: finalHtmlContent,
        image_url: item.thumbnail || defaultImage,
        external_url: link,
        category: 'local',
        status: 'published',
        author_id: null,
        social_copy: parsed.socialCopy || `📰 ${parsed.newTitle}\n\nLeé la nota en Nexativa News 👇\n#Ituzaingó #Corrientes`
      };
    } catch (error) {
      console.error("[Nora News Generator] Error Gemini:", error);
      return {
        title,
        excerpt: rawContent.replace(/<[^>]+>/g, '').substring(0, 160) + "...",
        content: `<p>${rawContent}</p><p><i>Fuente: <a href="${link}" target="_blank" rel="noopener noreferrer">Enlace Original</a></i></p>`,
        image_url: item.thumbnail || defaultImage,
        external_url: link,
        category: 'local',
        status: 'published'
      };
    }
  }
}

