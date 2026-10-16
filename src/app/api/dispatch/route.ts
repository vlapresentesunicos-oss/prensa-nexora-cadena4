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

    // 1. Despacho a WordPress (Portal Oficial de Cadena 4)
    try {
      const wpRes = await publishToWordPress({
        title,
        content,
        excerpt,
        imageUrl,
        status: "publish",
      });
      results.wordpress = wpRes;

      if (wpRes.success && articleId) {
        await supabaseAdmin
          .from("articles")
          .update({ wp_post_id: String(wpRes.postId) })
          .eq("id", articleId);
      }
    } catch (wpErr: any) {
      results.wordpress = { success: false, error: wpErr?.message || String(wpErr) };
    }

    // 2. Despacho a Redes Sociales (Meta: Instagram & Facebook)
    const captionToSend = socialCaption || `📢 ${title}\n\n${excerpt}\n\n#Noticias #Actualidad #Cadena4`;

    if (imageUrl) {
      try {
        const igRes = await publishToInstagram({ caption: captionToSend, imageUrl });
        results.instagram = igRes;
      } catch (igErr: any) {
        results.instagram = { success: false, error: igErr?.message };
      }
    }

    try {
      const fbRes = await publishToFacebookPage({ caption: captionToSend, imageUrl: imageUrl || undefined });
      results.facebook = fbRes;
    } catch (fbErr: any) {
      results.facebook = { success: false, error: fbErr?.message };
    }

    // 3. Despacho a Telegram Channel
    try {
      const tgRes = await broadcastToTelegram({
        title,
        excerpt,
        url: results.wordpress?.permalink || process.env.NEXT_PUBLIC_SITE_URL || "https://cadena4.com.ar",
        imageUrl,
      });
      results.telegram = tgRes;
    } catch (tgErr: any) {
      results.telegram = { success: false, error: tgErr?.message };
    }

    // 4. Despacho a Webhook Externo (Make.com / n8n si estan configurados)
    const webhookUrl = process.env.MAKE_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const whRes = await dispatchWebhookWithRetry(webhookUrl, {
          event: "article.published",
          timestamp: new Date().toISOString(),
          data: {
            articleId,
            title,
            excerpt,
            content,
            imageUrl,
            wordpressUrl: results.wordpress?.permalink,
            socialCaption: captionToSend,
          },
        });
        results.webhook = whRes;
      } catch (whErr: any) {
        results.webhook = { success: false, error: whErr?.message };
      }
    }

    // 5. Marcar como publicado en Supabase
    if (articleId) {
      await supabaseAdmin.from("articles").update({ social_published: true }).eq("id", articleId);
      
      // Registrar log de auditoria
      await supabaseAdmin.from("distribution_logs").insert([
        {
          article_id: articleId,
          channel_type: "omnichannel_dispatch",
          status: results.wordpress?.success ? "success" : "failed",
          payload: { title, channels: Object.keys(results) },
          response: JSON.stringify(results),
        },
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
