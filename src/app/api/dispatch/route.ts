import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { publishToWordPress } from "@/lib/connectors/wordpress";
import { publishToInstagram, publishToFacebookPage } from "@/lib/connectors/meta";
import { broadcastToTelegram } from "@/lib/connectors/telegram";
import { dispatchWebhookWithRetry } from "@/lib/connectors/webhook-dispatcher";

export const maxDuration = 45;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { articleId, title, content, excerpt = "", imageUrl = null, socialCaption = "" } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, error: "Título y contenido requeridos" }, { status: 400 });
    }

    const results: Record<string, any> = {};

    // Despacho Concurrente en Paralelo (Elimina cuello de botella secuencial)
    const captionToSend = socialCaption || `📢 ${title}\n\n${excerpt}\n\n#Noticias #Actualidad #Cadena4`;
    const webhookUrl = process.env.MAKE_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cadena4.com.ar";

    const [wpSettled, igSettled, fbSettled, tgSettled, whSettled] = await Promise.allSettled([
      // 1. WordPress
      publishToWordPress({
        title,
        content,
        excerpt,
        imageUrl,
        status: "publish",
      }),
      // 2. Instagram
      imageUrl ? publishToInstagram({ caption: captionToSend, imageUrl }) : Promise.resolve(null),
      // 3. Facebook
      publishToFacebookPage({ caption: captionToSend, imageUrl: imageUrl || undefined }),
      // 4. Telegram
      broadcastToTelegram({
        title,
        excerpt,
        url: siteUrl,
        imageUrl,
      }),
      // 5. Webhook externo
      webhookUrl
        ? dispatchWebhookWithRetry(webhookUrl, {
            event: "article.published",
            timestamp: new Date().toISOString(),
            data: {
              articleId,
              title,
              excerpt,
              content,
              imageUrl,
              socialCaption: captionToSend,
            },
          })
        : Promise.resolve(null),
    ]);

    // Consolidar resultados de forma resiliente
    if (wpSettled.status === "fulfilled") {
      results.wordpress = wpSettled.value;
    } else {
      results.wordpress = { success: false, error: wpSettled.reason?.message || String(wpSettled.reason) };
    }

    if (imageUrl) {
      if (igSettled.status === "fulfilled" && igSettled.value) {
        results.instagram = igSettled.value;
      } else if (igSettled.status === "rejected") {
        results.instagram = { success: false, error: igSettled.reason?.message || String(igSettled.reason) };
      }
    }

    if (fbSettled.status === "fulfilled") {
      results.facebook = fbSettled.value;
    } else {
      results.facebook = { success: false, error: fbSettled.reason?.message || String(fbSettled.reason) };
    }

    if (tgSettled.status === "fulfilled") {
      results.telegram = tgSettled.value;
    } else {
      results.telegram = { success: false, error: tgSettled.reason?.message || String(tgSettled.reason) };
    }

    if (webhookUrl && whSettled.status === "fulfilled" && whSettled.value) {
      results.webhook = whSettled.value;
    } else if (webhookUrl && whSettled.status === "rejected") {
      results.webhook = { success: false, error: whSettled.reason?.message || String(whSettled.reason) };
    }

    // Actualización y log en Supabase
    if (articleId) {
      const updatePayload: Record<string, any> = { social_published: true };
      if (results.wordpress?.success && results.wordpress?.postId) {
        updatePayload.wp_post_id = String(results.wordpress.postId);
      }

      await Promise.allSettled([
        supabaseAdmin.from("articles").update(updatePayload).eq("id", articleId),
        supabaseAdmin.from("distribution_logs").insert([
          {
            article_id: articleId,
            channel_type: "omnichannel_dispatch",
            status: results.wordpress?.success ? "success" : "partial",
            payload: { title, channels: Object.keys(results) },
            response: JSON.stringify(results),
          },
        ]),
      ]);
    }

    return NextResponse.json({
      success: true,
      message: "Orquestador de distribución finalizado",
      results,
    });
  } catch (error: any) {
    console.error("[Omnichannel Dispatch Error]:", error);
    return NextResponse.json({ success: false, error: error?.message || "Error al despachar" }, { status: 500 });
  }
}
