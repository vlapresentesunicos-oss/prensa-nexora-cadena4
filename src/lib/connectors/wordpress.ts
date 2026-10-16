/***
 * Conector Nativo WordPress REST API v2
 * Publica articulos y sube imagenes a la biblioteca de medios mediante Application Passwords.
 */

export interface WordPressPostPayload {
  title: string;
  content: string;
  excerpt?: string;
  imageUrl?: string | null;
  status?: "publish" | "draft";
  categories?: number[];
  tags?: number[];
}

export interface WordPressPublishResult {
  success: boolean;
  postId?: number;
  permalink?: string;
  error?: string;
}

export async function publishToWordPress(
  payload: WordPressPostPayload,
  customConfig?: { siteUrl?: string; username?: string; appPassword?: string }
): Promise<WordPressPublishResult> {
  const siteUrl = (customConfig?.siteUrl || process.env.WORDPRESS_SITE_URL || "").replace(/\/+$/, "");
  const username = customConfig?.username || process.env.WORDPRESS_APP_USERNAME || "";
  const password = (customConfig?.appPassword || process.env.WORDPRESS_APP_PASSWORD || "").replace(/\s+/g, "");

  if (!siteUrl || !username || !password) {
    return {
      success: false,
      error: "Credenciales de WordPress no configuradas (se requiere URL del sitio, usuario y contraseña de aplicación)",
    };
  }

  const basicAuthToken = Buffer.from(`${username}:${password}`).toString("base64");

  try {
    let featuredMediaId: number | null = null;

    // 1. Subir imagen destacada si se especifico URL externa
    if (payload.imageUrl && payload.imageUrl.startsWith("http")) {
      try {
        const imgRes = await fetch(payload.imageUrl);
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer();
          const contentType = imgRes.headers.get("content-type") || "image/jpeg";
          const ext = contentType.split("/")[1] || "jpg";
          const filename = `nexora_${Date.now()}.${ext}`;

          const mediaRes = await fetch(`${siteUrl}/wp-json/wp/v2/media`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${basicAuthToken}`,
              "Content-Disposition": `attachment; filename="${filename}"`,
              "Content-Type": contentType,
            },
            body: imgBuffer,
          });

          if (mediaRes.ok) {
            const mediaData = await mediaRes.json();
            if (mediaData && mediaData.id) {
              featuredMediaId = mediaData.id;
            }
          }
        }
      } catch (mediaErr) {
        console.warn("[WordPress Connector] Advertencia al subir imagen destacada:", mediaErr);
      }
    }

    // 2. Crear el Post en WordPress
    const wpBody: any = {
      title: payload.title,
      content: `${payload.content}<br><br><p><em>Fuente: Cobertura periodística en vivo generada por Prensa NexoraOne</em></p>`,
      excerpt: payload.excerpt || "",
      status: payload.status || "publish",
    };

    if (featuredMediaId) {
      wpBody.featured_media = featuredMediaId;
    }

    const postRes = await fetch(`${siteUrl}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuthToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(wpBody),
    });

    const postData = await postRes.json();

    if (!postRes.ok) {
      return {
        success: false,
        error: postData?.message || `Error HTTP ${postRes.status} al publicar en WordPress`,
      };
    }

    return {
      success: true,
      postId: postData.id,
      permalink: postData.link || `${siteUrl}/?p=${postData.id}`,
    };
  } catch (err: any) {
    console.error("[WordPress Connector] Error critico de red:", err);
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}
