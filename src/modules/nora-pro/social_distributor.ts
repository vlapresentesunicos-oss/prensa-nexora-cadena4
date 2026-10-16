/***
 * Módulo: Social Distributor (Nora Pro - Free Tier Edition)
 * Ubicación: /src/modules/nora-pro/social_distributor.ts
 * 
 * Propósito: Exponer las noticias optimizadas en un formato RSS/JSON para ser
 * consumidas gratuitamente por Make.com u otros automatizadores No-Code.
 */

// INTERRUPTOR DE EMERGENCIA (FEATURE FLAG)
const ENABLE_NORA_PRO = process.env.ENABLE_NORA_PRO === 'true';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  tags: string[];
  publishedAt: Date;
}

export class SocialDistributor {
  
  constructor() {
    if (!ENABLE_NORA_PRO) {
      console.warn("NORA PRO desactivado. El generador RSS no está activo.");
    }
  }

  /**
   * Genera el contenido de un Feed RSS limpio con los datos optimizados por IA.
   * Este feed puede ser expuesto en un endpoint (ej. /api/feeds/noticias-pro.xml)
   * para que Make.com lo lea periódicamente gratis.
   */
  public generateRssFeed(articles: NewsArticle[]): string {
    if (!ENABLE_NORA_PRO) return "";

    console.log(`[Social Distributor - Free Tier] Generando Feed RSS para automatización externa...`);

    const rssItems = articles.map(article => {
      // Pre-armado de copys para facilitar la vida a Make.com
      const xThreadHook = `🚨 URGENTE: ${article.title}\n\nAbro hilo 🧵👇`;
      const localHashtags = article.tags.map(tag => `#${tag}`).join(' ');
      const metaCopy = `📢 ${article.title}\n\n${article.summary}\n\nNoticia completa en la bio o enlace: ${article.url}\n\n${localHashtags}`;
      const waAlert = `*NEXATIVA NEWS - ALERTA INFORMATIVA* 📰\n\n📌 *${article.title}*\n\n${article.summary}\n\n👉 *Leé la nota completa acá:* ${article.url}`;

      return `
        <item>
          <title><![CDATA[${article.title}]]></title>
          <link>${article.url}</link>
          <guid>${article.id}</guid>
          <pubDate>${article.publishedAt.toUTCString()}</pubDate>
          <description><![CDATA[${article.summary}]]></description>
          <!-- Metadata extendida para automatizadores No-Code -->
          <nora:x_thread><![CDATA[${xThreadHook}]]></nora:x_thread>
          <nora:meta_copy><![CDATA[${metaCopy}]]></nora:meta_copy>
          <nora:wa_alert><![CDATA[${waAlert}]]></nora:wa_alert>
        </item>
      `;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0" xmlns:nora="http://nexativanews.com.ar/nora">
        <channel>
          <title>Nexativa News - Nora Pro Feed</title>
          <link>https://nexativanews.com.ar</link>
          <description>Feed optimizado por IA para distribución en redes (Vía Make.com)</description>
          ${rssItems}
        </channel>
      </rss>`;
  }
}

