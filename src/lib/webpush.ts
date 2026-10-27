import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase/admin";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:prensa@cadena4.com";

let isConfigured = false;

function initWebPush() {
  if (isConfigured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[WebPush]: VAPID keys no configuradas en entorno.");
    return false;
  }
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    isConfigured = true;
    return true;
  } catch (err) {
    console.error("[WebPush Config Error]:", err);
    return false;
  }
}

// Almacén en memoria de respaldo para garantizar funcionamiento inmediato
const memorySubscriptions = new Map<string, any>();

export async function saveSubscription(subscription: any, role: string = "Editor") {
  if (!subscription || !subscription.endpoint) return { success: false, error: "Invalid subscription" };
  
  memorySubscriptions.set(subscription.endpoint, { subscription, role, timestamp: Date.now() });

  // Intentar sincronizar en Supabase si la tabla existe
  try {
    await supabaseAdmin.from("prensa_push_subscriptions").upsert({
      endpoint: subscription.endpoint,
      keys: subscription.keys || {},
      user_role: role,
      updated_at: new Date().toISOString()
    }, { onConflict: "endpoint" });
  } catch (err) {
    // Si la tabla no fue creada aún en Supabase, el almacén en memoria asegura la entrega
    console.log("[WebPush Sync]: Guardado en memoria activa.");
  }

  return { success: true };
}

export async function getAllSubscriptions(): Promise<any[]> {
  const subs: any[] = [];
  
  // 1. Obtener de Supabase si está disponible
  try {
    const { data, error } = await supabaseAdmin
      .from("prensa_push_subscriptions")
      .select("endpoint, keys");
    if (!error && data && data.length > 0) {
      for (const row of data) {
        subs.push({
          endpoint: row.endpoint,
          keys: row.keys
        });
      }
    }
  } catch (e) {
    // Silencioso
  }

  // 2. Mezclar con almacén en memoria sin duplicar
  for (const [endpoint, val] of memorySubscriptions.entries()) {
    if (!subs.some(s => s.endpoint === endpoint)) {
      subs.push(val.subscription);
    }
  }

  return subs;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToAll(payload: PushNotificationPayload) {
  if (!initWebPush()) {
    return { success: false, sentCount: 0, error: "VAPID not configured" };
  }

  const subscriptions = await getAllSubscriptions();
  if (subscriptions.length === 0) {
    return { success: true, sentCount: 0, message: "No subscribers registered yet" };
  }

  const jsonPayload = JSON.stringify({
    title: payload.title || "🚨 Alerta Prensa NexoraOne",
    body: payload.body || "Nuevo despacho editorial disponible.",
    url: payload.url || "/admin/corresponsal",
    tag: payload.tag || "nexora-" + Date.now()
  });

  let sentCount = 0;
  const expiredEndpoints: string[] = [];
  const BATCH_SIZE = 25;

  for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
    const chunk = subscriptions.slice(i, i + BATCH_SIZE);
    const chunkPromises = chunk.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, jsonPayload);
        sentCount++;
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        } else {
          console.warn("[WebPush Send Warning]:", err?.message || err);
        }
      }
    });
    await Promise.allSettled(chunkPromises);
  }

  // Limpiar suscripciones expiradas en un solo lote eficiente
  if (expiredEndpoints.length > 0) {
    for (const ep of expiredEndpoints) {
      memorySubscriptions.delete(ep);
    }
    try {
      await supabaseAdmin.from("prensa_push_subscriptions").delete().in("endpoint", expiredEndpoints);
    } catch (e) {}
  }

  return { success: true, sentCount, totalSubscribers: subscriptions.length };
}
