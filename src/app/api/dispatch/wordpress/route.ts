import { NextResponse } from "next/server";
import { publishToWordPress } from "@/lib/connectors/wordpress";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await publishToWordPress({
      title: body.title || "Noticia de Prueba",
      content: body.content || "<p>Contenido de prueba emitido desde Prensa NexoraOne</p>",
      excerpt: body.excerpt || "",
      imageUrl: body.imageUrl || null,
      status: body.status || "publish",
    }, body.customConfig);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
