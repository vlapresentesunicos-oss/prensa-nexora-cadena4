import { sendPushToAll } from "@/lib/webpush";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const { data: flashes, error } = await supabaseAdmin
      .from("news_flashes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, flashes: flashes || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, summary, duration_seconds = 180, video_url, thumbnail_url = null, embed_url = null, segments = [] } = body;

    if (!title || !video_url) {
      return NextResponse.json({ success: false, error: "Título y URL de video son obligatorios" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("news_flashes")
      .insert([
        {
          title,
          summary,
          duration_seconds,
          video_url,
          thumbnail_url,
          embed_url,
          segments,
          partner_visible: true,
          status: "published",
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    
    // Disparo de alerta push en flashes urgentes
    try {
      await sendPushToAll({
        title: "⚡ FLASH EDITORIAL • ÚLTIMA HORA",
        body: title || "Flash de noticias de último momento emitido.",
        url: "/admin/flashes",
        tag: "flash-breaking"
      });
    } catch (e) {}
  
    return NextResponse.json({ success: true, flash: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
