"use server";

import supabaseAdmin from "@/lib/supabase/admin";
import { getStaffRole } from "../actions";

// Types matching database staging buffer
export interface StagingQueueItem {
  id: string;
  operator_id: string;
  raw_metadata_title: string | null;
  geolocation_coordinates: string;
  attached_media_url: string[];
  audio_url: string | null;
  status: 'PENDING_REVIEW' | 'APPROVED_NEXATIVA_ONLY' | 'APPROVED_PARTNER_ONLY' | 'APPROVED_ALL_SIMULTANEOUS' | 'AUDIO_ERROR_MANUAL_REVIEW_REQUIRED' | 'ARCHIVED';
  version_nexativa: {
    title: string;
    excerpt: string;
    content: string;
    tags: string[];
  } | null;
  version_partner: {
    title: string;
    content: string;
    attribution_footer?: string;
  } | null;
  transcription: string | null;
  created_at: string;
  updated_at: string;
}

export interface EditorialAlert {
  id: string;
  queue_item_id: string | null;
  alert_type: string;
  message: string;
  details: any;
  created_at: string;
}

/**
 * Helper to check database presence.
 * If the staging tables are missing (user hasn't executed migration), throws a custom error.
 */
async function checkTableExists(tableName: string) {
  const { error } = await supabaseAdmin.from(tableName).select("count").limit(1).maybeSingle();
  if (error && error.code === "42P01") {
    throw new Error(`MISSING_TABLE:${tableName}`);
  }
}

/**
 * Fetch all staging queue items sorted by date descending.
 */
export async function fetchStagingQueue(): Promise<StagingQueueItem[]> {
  const role = await getStaffRole();
  if (!role) throw new Error("No autorizado");

  try {
    await checkTableExists("editorial_staging_queue");
    let query = supabaseAdmin.from("editorial_staging_queue").select("*");

    if (role.startsWith("partner:")) {
      const partnerId = role.split(":")[1];
      query = query.eq("operator_id", partnerId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return data as StagingQueueItem[];
  } catch (err: any) {
    if (err.message?.includes("MISSING_TABLE")) {
      throw new Error("MIGRATION_REQUIRED");
    }
    throw err;
  }
}

/**
 * Fetch all editorial alerts sorted by date descending.
 */
export async function fetchEditorialAlerts(): Promise<EditorialAlert[]> {
  const role = await getStaffRole();
  if (!role) throw new Error("No autorizado");

  try {
    await checkTableExists("editorial_alerts");
    const { data, error } = await supabaseAdmin
      .from("editorial_alerts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as EditorialAlert[];
  } catch (err: any) {
    if (err.message?.includes("MISSING_TABLE")) {
      return []; // Silently return empty if table doesn't exist
    }
    throw err;
  }
}

/**
 * Delete a staging queue item from the buffer.
 */
export async function deleteStagingItem(id: string): Promise<boolean> {
  const role = await getStaffRole();
  if (!role) throw new Error("No autorizado");

  if (role.startsWith("partner:")) {
    const partnerId = role.split(":")[1];
    const { data: checkItem } = await supabaseAdmin
      .from("editorial_staging_queue")
      .select("operator_id")
      .eq("id", id)
      .single();
    if (!checkItem || checkItem.operator_id !== partnerId) {
      throw new Error("No autorizado para este artículo.");
    }
  }

  const { error } = await supabaseAdmin.from("editorial_staging_queue").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/**
 * Update the copies inside a staging queue item (allowing the admin to edit before publishing).
 */
export async function updateStagingItem(
  id: string, 
  versionNexativa: any, 
  versionPartner: any,
  attachedMediaUrl?: string[]
): Promise<boolean> {
  const role = await getStaffRole();
  if (!role) throw new Error("No autorizado");

  if (role.startsWith("partner:")) {
    const partnerId = role.split(":")[1];
    const { data: checkItem } = await supabaseAdmin
      .from("editorial_staging_queue")
      .select("operator_id")
      .eq("id", id)
      .single();
    if (!checkItem || checkItem.operator_id !== partnerId) {
      throw new Error("No autorizado para este artículo.");
    }
  }

  const updateData: any = {
    version_nexativa: versionNexativa,
    version_partner: versionPartner,
    updated_at: new Date().toISOString()
  };

  if (attachedMediaUrl !== undefined) {
    updateData.attached_media_url = attachedMediaUrl;
  }

  const { error } = await supabaseAdmin
    .from("editorial_staging_queue")
    .update(updateData)
    .eq("id", id);

  if (error) throw error;
  return true;
}

/**
 * Get the partner's registered webhook URL from settings.
 */
export async function getPartnerWebhookUrl(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "partner_webhook_url")
    .maybeSingle();

  if (error) {
    console.error("Error fetching partner webhook URL:", error);
    return "";
  }
  return data?.value || "";
}

/**
 * Save/Update the partner's registered webhook URL in settings.
 */
export async function savePartnerWebhookUrl(url: string): Promise<boolean> {
  const role = await getStaffRole();
  if (!role) throw new Error("No autorizado");

  const { error } = await supabaseAdmin
    .from("settings")
    .upsert([{ key: "partner_webhook_url", value: url }], { onConflict: "key" });

  if (error) throw error;
  return true;
}

/**
 * Retrieve list of registered partners.
 */
export async function getPartnersList(): Promise<{ id: string; name: string; url: string }[]> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "partners_list")
    .maybeSingle();

  if (error || !data?.value) {
    // If list does not exist yet, fallback to single legacy partner if configured
    const legacyUrl = await getPartnerWebhookUrl();
    if (legacyUrl) {
      return [{ id: "legacy-partner", name: "Socio Principal", url: legacyUrl }];
    }
    return [];
  }

  try {
    return JSON.parse(data.value);
  } catch (e) {
    return [];
  }
}

/**
 * Save/Update list of registered partners.
 */
export async function savePartnersList(partners: { id: string; name: string; url: string }[]): Promise<boolean> {
  const role = await getStaffRole();
  if (!role) throw new Error("No autorizado");

  const { error } = await supabaseAdmin
    .from("settings")
    .upsert([{ key: "partners_list", value: JSON.stringify(partners) }], { onConflict: "key" });

  if (error) throw error;
  return true;
}

/**
 * Logs a critical alert when webhook dispatcher fails completely.
 */
async function logWebhookFailureAlert(queueItemId: string, webhookUrl: string, errorMsg: string) {
  try {
    await supabaseAdmin.from("editorial_alerts").insert([
      {
        queue_item_id: queueItemId,
        alert_type: "WEBHOOK_FAILURE",
        message: `Error al despachar webhook al socio. Detalle: ${errorMsg}`,
        details: {
          partner_webhook_url: webhookUrl,
          error: errorMsg,
          attempts: 4,
          timestamp: new Date().toISOString()
        }
      }
    ]);
  } catch (err) {
    console.error("[Webhook Dispatcher] Error al intentar guardar alerta crítica:", err);
  }
}

/**
 * Outbound REST API call (POST) to Partner Webhook with retry logic and exponential backoff
 */
async function dispatchPartnerWebhook(
  webhookUrl: string, 
  title: string, 
  content: string, 
  featuredImage: string | null, 
  queueItemId: string,
  attributionFooter?: string
): Promise<{ success: boolean; error?: string }> {
  const footer = attributionFooter || "Cobertura en exteriores por gentileza de Nexativanews.com.ar";
  const payload = {
    title: title,
    content: `${content} <br><br> <i>${footer}</i>`,
    featured_image: featuredImage || "",
    status: "draft", // Defaults to draft to give them final editorial control
    categories: ["Regionales", "Ultimo Momento"]
  };

  const maxRetries = 3;
  let delay = 1000; // starts with 1s delay
  let lastError = "";
  let success = false;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`[Webhook Dispatcher] Enviando intento ${attempt} a ${webhookUrl}...`);
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 200 || response.status === 201) {
        console.log(`[Webhook Dispatcher] Webhook enviado con éxito en el intento ${attempt}.`);
        success = true;
        break;
      } else {
        const errorText = await response.text();
        lastError = `Status HTTP ${response.status}: ${errorText || "Sin mensaje de error"}`;
        console.warn(`[Webhook Dispatcher] Intento ${attempt} falló con error: ${lastError}`);
      }
    } catch (err: any) {
      lastError = err.message || String(err);
      console.warn(`[Webhook Dispatcher] Intento ${attempt} falló con excepción: ${lastError}`);
    }

    if (attempt <= maxRetries) {
      console.log(`[Webhook Dispatcher] Reintentando en ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }

  if (!success) {
    console.error(`[Webhook Dispatcher] Todos los intentos de webhook fallaron. Guardando alerta crítica.`);
    await logWebhookFailureAlert(queueItemId, webhookUrl, lastError);
    return { success: false, error: lastError };
  }

  return { success: true };
}

/**
 * Approve and publish staged correspondent submissions.
 */
export async function approveStagingItem(
  id: string, 
  actionType: "APPROVE_NEXATIVA_ONLY" | "APPROVE_PARTNER_ONLY" | "APPROVE_ALL_SIMULTANEOUS",
  selectedWebhooks?: string[]
): Promise<{ success: boolean; error?: string; webhookError?: string }> {
  const role = await getStaffRole();
  if (!role) throw new Error("No autorizado");

  // 1. Fetch the item from queue
  const { data: item, error: fetchError } = await supabaseAdmin
    .from("editorial_staging_queue")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !item) {
    return { success: false, error: fetchError?.message || "Artículo no encontrado en la cola de staging." };
  }

  if (role.startsWith("partner:")) {
    const partnerId = role.split(":")[1];
    if (item.operator_id !== partnerId) {
      return { success: false, error: "No tienes autorización para gestionar este artículo." };
    }
  }

  const stagingItem = item as StagingQueueItem;
  const featuredImage = stagingItem.attached_media_url && stagingItem.attached_media_url.length > 0 
    ? stagingItem.attached_media_url[0] 
    : null;

  let nexativaPublished = false;
  let partnerDispatched = false;
  let webhookErrMessage = "";

  // A) Publish to Prensa NexoraOne • Cadena 4 (public.articles)
  if (actionType === "APPROVE_NEXATIVA_ONLY" || actionType === "APPROVE_ALL_SIMULTANEOUS") {
    if (!stagingItem.version_nexativa) {
      return { success: false, error: "La Versión Nexativa no está disponible para publicar." };
    }

    // Insert as published article
    const { error: insertError } = await supabaseAdmin.from("articles").insert([
      {
        title: stagingItem.version_nexativa.title,
        excerpt: stagingItem.version_nexativa.excerpt,
        content: stagingItem.version_nexativa.content,
        image_url: featuredImage,
        category: "local", // Categoría local por defecto para reportes locales
        status: "published",
        updated_at: new Date().toISOString()
      }
    ]);

    if (insertError) {
      return { success: false, error: `Error al publicar en Nexativa: ${insertError.message}` };
    }
    nexativaPublished = true;
  }

  // B) Dispatch to Partner Webhook
  if (actionType === "APPROVE_PARTNER_ONLY" || actionType === "APPROVE_ALL_SIMULTANEOUS") {
    if (!stagingItem.version_partner) {
      return { success: false, error: "La Versión Socio no está disponible para publicar." };
    }

    const webhooks = selectedWebhooks && selectedWebhooks.length > 0
      ? selectedWebhooks
      : [await getPartnerWebhookUrl()];

    const validWebhooks = webhooks.filter(url => url && url.trim() !== "");

    if (validWebhooks.length === 0) {
      const errMsg = "URL de Webhook del socio no configurada en las redes de Nexativa.";
      await logWebhookFailureAlert(stagingItem.id, "No configurada", errMsg);
      if (actionType === "APPROVE_PARTNER_ONLY") {
        return { success: false, error: errMsg };
      } else {
        webhookErrMessage = errMsg;
      }
    } else {
      // Parallel execution for all selected partner webhooks
      const dispatchPromises = validWebhooks.map(async (webhookUrl) => {
        const footer = stagingItem.version_partner!.attribution_footer || "Cobertura en exteriores por gentileza de Nexativanews.com.ar";
        const dispatchRes = await dispatchPartnerWebhook(
          webhookUrl,
          stagingItem.version_partner!.title,
          stagingItem.version_partner!.content,
          featuredImage,
          stagingItem.id,
          footer
        );
        return { url: webhookUrl, success: dispatchRes.success, error: dispatchRes.error };
      });

      const results = await Promise.all(dispatchPromises);
      const failures = results.filter(r => !r.success);

      if (failures.length === 0) {
        partnerDispatched = true;
      } else {
        const failedUrls = failures.map(f => f.url).join(", ");
        webhookErrMessage = `Falló el envío a: ${failedUrls}`;
        if (failures.length < results.length) {
          partnerDispatched = true; // At least one was dispatched successfully
        }
        if (actionType === "APPROVE_PARTNER_ONLY" && failures.length === results.length) {
          return { success: false, error: `Error al despachar a los socios: ${webhookErrMessage}` };
        }
      }
    }
  }

  // 3. Update status of the staging item based on execution
  let newStatus = stagingItem.status;
  if (actionType === "APPROVE_ALL_SIMULTANEOUS") {
    newStatus = partnerDispatched ? "APPROVED_ALL_SIMULTANEOUS" : "APPROVED_NEXATIVA_ONLY";
  } else if (actionType === "APPROVE_NEXATIVA_ONLY") {
    newStatus = "APPROVED_NEXATIVA_ONLY";
  } else if (actionType === "APPROVE_PARTNER_ONLY") {
    newStatus = partnerDispatched ? "APPROVED_PARTNER_ONLY" : stagingItem.status;
  }

  const { error: updateError } = await supabaseAdmin
    .from("editorial_staging_queue")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    console.error("Error al actualizar estado en cola de staging:", updateError);
  }

  return { 
    success: true, 
    webhookError: webhookErrMessage || undefined 
  };
}

/**
 * Archive or unarchive a staging queue item.
 */
export async function archiveStagingItem(id: string, archive: boolean): Promise<boolean> {
  const role = await getStaffRole();
  if (!role) throw new Error("No autorizado");

  if (role.startsWith("partner:")) {
    const partnerId = role.split(":")[1];
    const { data: checkItem } = await supabaseAdmin
      .from("editorial_staging_queue")
      .select("operator_id")
      .eq("id", id)
      .single();
    if (!checkItem || checkItem.operator_id !== partnerId) {
      throw new Error("No autorizado para este artículo.");
    }
  }

  const newStatus = archive ? "ARCHIVED" : "PENDING_REVIEW";

  const { error } = await supabaseAdmin
    .from("editorial_staging_queue")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
  return true;
}


import { verifyNewsVeracity, FactCheckReport } from "@/modules/nora-pro/fact_checker";

/**
 * Server action para auditar fake news y contenido inapropiado con Nora
 */
export async function auditReportSafety(
  title: string, 
  content: string, 
  corresponsalName?: string
): Promise<{ success: boolean; report?: FactCheckReport; error?: string }> {
  try {
    const report = await verifyNewsVeracity(title, content, corresponsalName);
    return { success: true, report };
  } catch (e: any) {
    return { success: false, error: e?.message || "Error al auditar" };
  }
}
