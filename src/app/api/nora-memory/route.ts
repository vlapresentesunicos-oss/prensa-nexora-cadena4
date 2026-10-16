import { NextResponse } from "next/server";
import { appendSessionMessages, getSessionMessages, NoraSessionMessage } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId") || "";
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    if (!sessionId) {
      return NextResponse.json({ sessionId: "", messages: [] });
    }

    const messages = await getSessionMessages(sessionId, limit, "nora-prensa");
    return NextResponse.json({ sessionId, messages });
  } catch (err: any) {
    return NextResponse.json({ sessionId: "", messages: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, userMessage, assistantResponse, metadata } = body;

    if (!sessionId || !userMessage || !assistantResponse) {
      return NextResponse.json({ ok: false, warning: "Datos incompletos" });
    }

    const newMessages: NoraSessionMessage[] = [
      {
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
        metadata,
      },
      {
        role: "assistant",
        content: assistantResponse,
        timestamp: new Date().toISOString(),
      },
    ];

    appendSessionMessages(sessionId, newMessages, "nora-prensa").catch(() => {});
    return NextResponse.json({ ok: true, queued: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message });
  }
}
