import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-service-key";

// Circuit Breaker State
let circuitOpenUntil = 0;
let consecutiveFailures = 0;
const FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 15000; // 15 segundos

const resilientFetch = async (url: any, options: any = {}) => {
  const now = Date.now();
  if (now < circuitOpenUntil) {
    throw new Error("[Supabase Circuit Breaker] Conexión temporalmente suspendida por fallas de red/DNS.");
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout estricto

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // Éxito: restablecemos fallas consecutivas
    consecutiveFailures = 0;
    return response;
  } catch (err: any) {
    consecutiveFailures++;
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
      circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
      console.warn(`[Supabase Circuit Breaker] Circuito ABIERTO por ${CIRCUIT_COOLDOWN_MS / 1000}s tras ${consecutiveFailures} fallos:`, err?.message);
    }
    throw err;
  }
};

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    fetch: resilientFetch,
  },
});

export default supabaseAdmin;
