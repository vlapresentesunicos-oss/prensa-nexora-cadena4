import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

let syndicationCache: { [key: string]: { data: any; expiresAt: number } } = {};
const SYNDICATION_CACHE_TTL_MS = 20 * 1000;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const cacheKey = `limit_${limit}`;

    const now = Date.now();
    if (syndicationCache[cacheKey] && syndicationCache[cacheKey].expiresAt > now) {
      return NextResponse.json(
        syndicationCache[cacheKey].data,
        {
          headers: {
            "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40",
            "X-Cache": "HIT",
          },
        }
      );
    }

    const { data: items, error } = await supabaseAdmin
      .from("editorial_staging_queue")
      .select("id, version_partner, raw_metadata_title, attached_media_url, geolocation_coordinates, updated_at, created_at")
      .in("status", ["APPROVED_ALL_SIMULTANEOUS", "APPROVED_PARTNER_ONLY"])
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[Syndication API Fallback]:", error.message);
      return NextResponse.json(
        { success: true, count: 0, articles: [], degradedMode: true, message: "Modo contingencia activo" },
        { headers: { "X-Degraded-Mode": "true" } }
      );
    }

    const syndicatedArticles = (items || []).map((item: any) => {
      const versionPartner = item.version_partner || {};
      const featuredImage = item.attached_media_url && item.attached_media_url.length > 0 ? item.attached_media_url[0] : null;

      return {
        id: item.id,
        title: versionPartner.title || item.raw_metadata_title || "Reporte Periodístico",
        content: versionPartner.content || "",
        attribution_footer: versionPartner.attribution_footer || "Cobertura oficial por Cadena 4 & Prensa NexoraOne",
        image_url: featuredImage,
        coordinates: item.geolocation_coordinates,
        published_at: item.updated_at || item.created_at,
      };
    });

    const responsePayload = { success: true, count: syndicatedArticles.length, articles: syndicatedArticles };
    syndicationCache[cacheKey] = { data: responsePayload, expiresAt: now + SYNDICATION_CACHE_TTL_MS };

    return NextResponse.json(responsePayload, {
      headers: {
        "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40",
        "X-Cache": "MISS",
      },
    });
  } catch (err: any) {
    console.warn("[Syndication API Catch Fallback]:", err?.message);
    return NextResponse.json(
      { success: true, count: 0, articles: [], degradedMode: true, message: "Modo contingencia activo" },
      { headers: { "X-Degraded-Mode": "true" } }
    );
  }
}
