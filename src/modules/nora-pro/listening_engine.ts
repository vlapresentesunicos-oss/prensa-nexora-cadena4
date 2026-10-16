/***
 * Módulo: Listening Engine (Nora Pro - Free Tier Edition)
 * Ubicación: /src/modules/nora-pro/listening_engine.ts
 * 
 * Propósito: Escucha omnicanal utilizando Gemini 1.5 Flash (texto y audio multimodal en un paso)
 * y emparejamiento comercial basado en enlaces manuales Click-to-Chat de WhatsApp (Costo 0).
 */

// INTERRUPTOR DE EMERGENCIA (FEATURE FLAG)
const ENABLE_NORA_PRO = process.env.ENABLE_NORA_PRO === 'true';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

interface UserMessage {
  userId: string; // ej: número de teléfono o ID de sesión
  type: 'text' | 'audio';
  content: string; // Texto o ArrayBuffer / Base64 del audio
}

export class ListeningEngine {

  constructor() {
    if (!ENABLE_NORA_PRO) {
      console.warn("NORA PRO desactivado. El Listening Engine (Free Tier) no se ejecutará.");
    }
  }

  /**
   * Procesa el mensaje enviándolo a Gemini 1.5 Flash (capacidad multimodal).
   */
  public async processMessageWithFlash(message: UserMessage): Promise<void> {
    if (!ENABLE_NORA_PRO) return;

    try {
      console.log(`[Listening Engine - Free Tier] Procesando mensaje de usuario...`);
      await this.applyRateLimitDelay();

      // En la implementación real, aquí se envía 'message.content' (sea texto o el archivo de audio)
      // directamente a Gemini 1.5 Flash usando el SDK de Google AI Studio.
      // Flash es lo suficientemente rápido y económico para hacer transcripción y extracción en la misma llamada.
      
      console.log(`[Google AI Studio] Llamando a ${GEMINI_MODEL} (Audio/Text to Intent)...`);
      
      // MOCK DE RESPUESTA DE GEMINI FLASH
      const mockFlashResponse = {
        hasIntent: true,
        productSearched: "Bicicleta",
        confidence: 0.95
      };

      if (mockFlashResponse.hasIntent && mockFlashResponse.confidence > 0.8) {
        console.log(`[Listening Engine] Intención detectada por Flash: ${mockFlashResponse.productSearched}`);
        await this.matchingEngine(message.userId, mockFlashResponse.productSearched);
      }
    } catch (error) {
      console.error(`[Listening Engine] Error procesando con Gemini Flash:`, error);
    }
  }

  /**
   * Middleware de Control de Flujo para respetar Rate Limits de la API Gratuita (Error 429)
   */
  private async applyRateLimitDelay(): Promise<void> {
    // Implementación básica de delay/cola de espera.
    // En producción se usaría un rate limiter (ej. upstash/ratelimit) o una cola simple en memoria.
    const delayMs = 1500; // 1.5 segundos entre peticiones para tier gratuito
    console.log(`[Middleware] Aplicando delay de ${delayMs}ms para respetar cuota gratuita.`);
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  private async matchingEngine(userId: string, product: string): Promise<void> {
    const isInInternalStore = false; // Asumimos externo para probar la ruta de monetización gratis

    if (!isInInternalStore) {
      console.log(`[Matching] Producto externo. Generando link Click-to-Chat para operador humano.`);
      
      // Generar link wa.me para que el operador envíe el mensaje sin costo de API
      const merchantPhone = "5491100000000"; // Número del comercio local
      this.generateClickToChatLink(merchantPhone, product);
    }
  }

  /**
   * Genera enlace wa.me para envío manual (Costo $0)
   */
  private generateClickToChatLink(phone: string, productSearched: string): void {
    const paymentLink = "https://nexativanews.com.ar/auspiciar";
    
    // Mensaje pre-armado
    const message = `¡Hola! 👋 Te escribe Nora, la Asistente Comercial de NexativaNews. Detectamos a un vecino buscando activamente: *${productSearched}*. Para recibir sus datos hoy mismo, activá tu auspicio acá: ${paymentLink}`;
    
    // Codificamos URL para wa.me
    const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    console.log(`\n======================================================`);
    console.log(`✅ ACCIÓN REQUERIDA (OPERADOR HUMANO):`);
    console.log(`Un vecino busca: ${productSearched}`);
    console.log(`Haz clic en el siguiente enlace para enviar la oferta comercial GRATIS:`);
    console.log(`${waLink}`);
    console.log(`======================================================\n`);
    
    // En un sistema real, este link se envía al dashboard de administración o al Slack/WhatsApp interno del equipo.
  }
}

