import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// In-Memory Cache para alta concurrencia / absorción de picos
let rssCache: { xml: string; expiresAt: number } | null = null;
const RSS_CACHE_TTL_MS = 30 * 1000;

export async function GET() {
  try {
    const now = Date.now();
    if (rssCache && rssCache.expiresAt > now) {
      return new NextResponse(rssCache.xml, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
          "X-Cache-Status": "HIT",
        },
      });
    }

    const { data: articles } = await supabaseAdmin
      .from("articles")
      .select("id, title, excerpt, created_at, external_url, image_url")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(30);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cadena4.com.ar";

    const itemsXml = (articles || [])
      .map((art) => {
        return `
        <item>
          <title><![CDATA[${art.title}]]></title>
          <link>${art.external_url || `${siteUrl}/noticias/${art.id}`}</link>
          <guid>${art.id}</guid>
          <pubDate>${new Date(art.created_at).toUTCString()}</pubDate>
          <description><![CDATA[${art.excerpt || art.title}]]></description>
          ${art.image_url ? `<enclosure url="${art.image_url}" type="image/jpeg" />` : ""}
        </item>`;
      })
      .join("\n");

    const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0">
      <channel>
        <title>Prensa NexoraOne • Cadena 4</title>
        <link>${siteUrl}</link>
        <description>Feed Oficial de Noticias de Cadena 4 por Nexora One</description>
        <language>es</language>
        ${itemsXml}
      </channel>
    </rss>`;

    rssCache = { xml: rssXml, expiresAt: now + RSS_CACHE_TTL_MS };

    return new NextResponse(rssXml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        "X-Cache-Status": "MISS",
      },
    });
  } catch (err: any) {
    console.warn("[RSS API Catch Fallback]:", err?.message);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cadena4.com.ar";
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0">
      <channel>
        <title>Prensa NexoraOne • Cadena 4</title>
        <link>${siteUrl}</link>
        <description>Feed Oficial de Noticias de Cadena 4 por Nexora One (Modo Contingencia)</description>
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
