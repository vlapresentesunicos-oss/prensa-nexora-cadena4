/***
 * Conector Meta Graph API (Instagram & Facebook Pages)
 * Publica contenido con copy viral e imagenes a traves de la API oficial de Meta.
 */

export interface MetaPublishPayload {
  caption: string;
  imageUrl?: string;
  linkUrl?: string;
}

export async function publishToInstagram(
  payload: MetaPublishPayload,
  customConfig?: { accountId?: string; accessToken?: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const accountId = customConfig?.accountId || process.env.INSTAGRAM_ACCOUNT_ID;
  const token = customConfig?.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accountId || !token || !payload.imageUrl) {
    return {
      success: false,
      error: "Instagram requiere INSTAGRAM_ACCOUNT_ID, INSTAGRAM_ACCESS_TOKEN y una URL de imagen publica",
    };
  }

  try {
    // 1. Crear contenedor de medio
    const containerUrl = `https://graph.facebook.com/v19.0/${accountId}/media?image_url=${encodeURIComponent(
      payload.imageUrl
    )}&caption=${encodeURIComponent(payload.caption)}&access_token=${encodeURIComponent(token)}`;

    const cRes = await fetch(containerUrl, { method: "POST" });
    const cData = await cRes.json();

    if (!cData || !cData.id) {
      return { success: false, error: cData?.error?.message || "Fallo al crear contenedor en Instagram" };
    }

    // 2. Publicar contenedor
    const publishUrl = `https://graph.facebook.com/v19.0/${accountId}/media_publish?creation_id=${cData.id}&access_token=${encodeURIComponent(
      token
    )}`;

    const pRes = await fetch(publishUrl, { method: "POST" });
    const pData = await pRes.json();

    if (!pData || !pData.id) {
      return { success: false, error: pData?.error?.message || "Fallo al publicar medio en Instagram" };
    }

    return { success: true, id: pData.id };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function publishToFacebookPage(
  payload: MetaPublishPayload,
  customConfig?: { pageId?: string; accessToken?: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const pageId = customConfig?.pageId || process.env.FACEBOOK_PAGE_ID;
  const token = customConfig?.accessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !token) {
    return { success: false, error: "Facebook requiere FACEBOOK_PAGE_ID y FACEBOOK_PAGE_ACCESS_TOKEN" };
  }

  try {
    const endpoint = payload.imageUrl
      ? `https://graph.facebook.com/v19.0/${pageId}/photos`
      : `https://graph.facebook.com/v19.0/${pageId}/feed`;

    const body: any = {
      message: payload.caption,
      access_token: token,
    };

    if (payload.imageUrl) {
      body.url = payload.imageUrl;
    } else if (payload.linkUrl) {
      body.link = payload.linkUrl;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, error: data?.error?.message || "Error al publicar en Facebook Page" };
    }

    return { success: true, id: data.id || data.post_id };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
