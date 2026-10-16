import { NextResponse } from "next/server";
import { dispatchWebhookWithRetry } from "@/lib/connectors/webhook-dispatcher";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url = process.env.MAKE_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL, payload } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: "No se proporcionó URL de webhook" }, { status: 400 });
    }

    const res = await dispatchWebhookWithRetry(url, payload || { event: "ping", timestamp: new Date().toISOString(), data: { message: "Conexión de prueba exitosa desde Prensa NexoraOne" } });
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
