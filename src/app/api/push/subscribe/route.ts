import { NextResponse } from "next/server";
import { saveSubscription } from "@/lib/webpush";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, role = "Editor" } = body;
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ success: false, error: "Subscripción requerida" }, { status: 400 });
    }

    await saveSubscription(subscription, role);
    return NextResponse.json({ success: true, message: "Suscripción Push registrada con éxito" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
