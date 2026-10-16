/***
 * Despachador de Webhooks Salientes con Reintentos Exponenciales
 * Conecta con Make.com, n8n o APIs de clientes.
 */

export interface WebhookPayload {
  event: "article.published" | "flash.created" | "report.received";
  timestamp: string;
  data: any;
}

export async function dispatchWebhookWithRetry(
  url: string,
  payload: WebhookPayload,
  maxRetries: number = 3
): Promise<{ success: boolean; attempts: number; error?: string }> {
  if (!url || !url.startsWith("http")) {
    return { success: false, attempts: 0, error: "URL de webhook invalida" };
  }

  let delay = 1000;
  let lastError = "";

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "PrensaNexoraOne/1.0",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return { success: true, attempts: attempt };
      } else {
        lastError = `HTTP ${res.status}: ${await res.text().catch(() => "")}`;
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
    }

    if (attempt <= maxRetries) {
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }

  return { success: false, attempts: maxRetries + 1, error: lastError };
}
