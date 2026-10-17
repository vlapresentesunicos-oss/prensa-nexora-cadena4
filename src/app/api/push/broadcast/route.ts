import { NextResponse } from "next/server";
import { sendPushToAll } from "@/lib/webpush";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, body: messageBody, url = "/admin/corresponsal", tag } = body;

    if (!title || !messageBody) {
      return NextResponse.json({ success: false, error: "title and body are required" }, { status: 400 });
    }

    const result = await sendPushToAll({
      title,
      body: messageBody,
      url,
      tag: tag || "editorial-alert"
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
