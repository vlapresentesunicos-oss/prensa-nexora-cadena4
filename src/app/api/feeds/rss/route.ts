import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: articles } = await supabaseAdmin
      .from("articles")
      .select("*")
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

    return new NextResponse(rssXml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "s-maxage=300, stale-while-revalidate",
      },
    });
  } catch (err: any) {
    return new NextResponse("Error generando RSS", { status: 500 });
  }
}
