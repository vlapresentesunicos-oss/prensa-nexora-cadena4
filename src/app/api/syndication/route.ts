import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const { data: items, error } = await supabaseAdmin
      .from("editorial_staging_queue")
      .select("*")
      .in("status", ["APPROVED_ALL_SIMULTANEOUS", "APPROVED_PARTNER_ONLY"])
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

    return NextResponse.json({ success: true, count: syndicatedArticles.length, articles: syndicatedArticles });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Error interno del servidor" }, { status: 500 });
  }
}
