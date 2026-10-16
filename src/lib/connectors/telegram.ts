/***
 * Conector Telegram Bot API
 * Transmite noticias inmediatamente a canales oficiales de Telegram.
 */

export interface TelegramMessagePayload {
  title: string;
  excerpt: string;
  url: string;
  imageUrl?: string | null;
}

export async function broadcastToTelegram(
  payload: TelegramMessagePayload,
  customConfig?: { botToken?: string; channelId?: string }
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const botToken = customConfig?.botToken || process.env.TELEGRAM_BOT_TOKEN;
  const channelId = customConfig?.channelId || process.env.TELEGRAM_CHANNEL_ID;

  if (!botToken || !channelId) {
    return { success: false, error: "Telegram requiere TELEGRAM_BOT_TOKEN y TELEGRAM_CHANNEL_ID" };
  }

  const caption = `🔴 <b>${payload.title}</b>\n\n${payload.excerpt || ""}\n\n👉 <a href="${payload.url}">Leer nota completa</a>\n\n<i>Prensa NexoraOne • Cadena 4</i>`;

  try {
    const endpoint = payload.imageUrl
      ? `https://api.telegram.org/bot${botToken}/sendPhoto`
      : `https://api.telegram.org/bot${botToken}/sendMessage`;

    const body: any = {
      chat_id: channelId,
      parse_mode: "HTML",
    };

    if (payload.imageUrl) {
      body.photo = payload.imageUrl;
      body.caption = caption;
    } else {
      body.text = caption;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!data.ok) {
      return { success: false, error: data.description || "Error al transmitir en Telegram" };
    }

    return { success: true, messageId: data.result?.message_id };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
