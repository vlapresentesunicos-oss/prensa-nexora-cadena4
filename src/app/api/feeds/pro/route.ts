import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// In-Memory Cache para Feed Pro No-Code
let feedProCache: { xml: string; expiresAt: number } | null = null;
const FEED_PRO_CACHE_TTL_MS = 30 * 1000;

export async function GET() {
  try {
    const now = Date.now();
    if (feedProCache && feedProCache.expiresAt > now) {
      return new NextResponse(feedProCache.xml, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, s-maxage=180, stale-while-revalidate=60",
          "X-Cache-Status": "HIT",
        },
      });
    }

    const { data: articles } = await supabaseAdmin
      .from("articles")
      .select("id, title, excerpt, created_at, external_url, image_url")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(20);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cadena4.com.ar";

    const itemsXml = (articles || [])
      .map((art) => {
        const xThreadHook = `🚨 ÚLTIMA HORA: ${art.title}\n\nConozca los detalles en el siguiente hilo 👇`;
        const metaCopy = `📢 ${art.title}\n\n${art.excerpt || ""}\n\nNota completa en el enlace oficial.\n\n#Noticias #Actualidad #Cadena4`;
        const waAlert = `*CADENA 4 • ALERTA INFORMATIVA* 📰\n\n📌 *${art.title}*\n\n${art.excerpt || ""}\n\n👉 *Lea la nota completa:* ${siteUrl}/noticias/${art.id}`;

        return `
        <item>
          <title><![CDATA[${art.title}]]></title>
          <link>${art.external_url || `${siteUrl}/noticias/${art.id}`}</link>
          <guid>${art.id}</guid>
          <pubDate>${new Date(art.created_at).toUTCString()}</pubDate>
          <description><![CDATA[${art.excerpt || art.title}]]></description>
          <nora:x_thread><![CDATA[${xThreadHook}]]></nora:x_thread>
          <nora:meta_copy><![CDATA[${metaCopy}]]></nora:meta_copy>
          <nora:wa_alert><![CDATA[${waAlert}]]></nora:wa_alert>
          ${art.image_url ? `<enclosure url="${art.image_url}" type="image/jpeg" />` : ""}
        </item>`;
      })
      .join("\n");

    const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:nora="https://nexora.one/nora">
      <channel>
        <title>Prensa NexoraOne • Feed Pro Automatizado</title>
        <link>${siteUrl}</link>
        <description>Feed Pro enriquecido para automatizadores No-Code</description>
        <language>es</language>
        ${itemsXml}
      </channel>
    </rss>`;

    feedProCache = { xml: rssXml, expiresAt: now + FEED_PRO_CACHE_TTL_MS };

    return new NextResponse(rssXml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=180, stale-while-revalidate=60",
        "X-Cache-Status": "MISS",
      },
    });
  } catch (err: any) {
    console.warn("[Feed Pro Catch Fallback]:", err?.message);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cadena4.com.ar";
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:nora="https://nexora.one/nora">
      <channel>
        <title>Prensa NexoraOne • Feed Pro Automatizado</title>
        <link>${siteUrl}</link>
        <description>Feed Pro enriquecido para automatizadores No-Code (Modo Contingencia)</description>
        <language>es</language>
      </channel>
    </rss>`;
    return new NextResponse(fallbackXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=30",
        "X-Degraded-Mode": "true",
      },
    });
  }
}
