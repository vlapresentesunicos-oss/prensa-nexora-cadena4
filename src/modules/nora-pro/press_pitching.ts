/***
 * Módulo: Press Pitching Engine (NORA Pro)
 * Ubicación: /src/modules/nora-pro/press_pitching.ts
 * 
 * Propósito: Generar correos de Pitching hiper-personalizados para periodistas,
 * adaptando el enfoque según el medio (Economía, Tecnología, Negocios, Pymes).
 */

export interface JournalistTarget {
  name: string;
  mediaOutlet: string;
  email: string;
  specialty: 'Economía' | 'Tecnología' | 'Negocios' | 'General';
}

export interface PersonalizedPitch {
  journalist: JournalistTarget;
  subject: string;
  body: string;
  followUpMaxAllowed: number;
}

export function generatePersonalizedPitch(target: JournalistTarget): PersonalizedPitch {
  let angle = "";
  
  switch (target.specialty) {
    case 'Economía':
      angle = "la reconfiguración del mercado de servicios locales e independientes frente al escenario inflacionario y la búsqueda de márgenes directos sin intermediarios";
      break;
    case 'Tecnología':
      angle = "la adopción práctica de micro-agentes conversacionales con IA en WhatsApp para democratizar las ventas de pequeños comercios";
      break;
    case 'Negocios':
    case 'General':
    default:
      angle = "el modelo híbrido entre portal de noticias de cercanía y marketplace directo que está permitiendo a profesionales independientes multiplicar sus ventas";
      break;
  }

  const subject = `[EXCLUSIVA/DATOS] Estudio Nexativa 2026: El boom del +42% en contrataciones locales`;
  
  const body = `Hola ${target.name},\n\n` +
    `Espero que estés muy bien. Sigo habitualmente tus publicaciones sobre ${target.specialty.toLowerCase()} e innovación en ${target.mediaOutlet}.\n\n` +
    `Te escribo porque desde Nexativa (nexativanews.com.ar) acabamos de publicar nuestro "Estudio Nexativa 2026", centrado en ${angle}.\n\n` +
    `Principales hallazgos del informe que pueden ser de gran valor para tu audiencia:\n` +
    `- 📈 +42% en demandas de cotización directas para profesionales locales.\n` +
    `- ⚡ 68% de aceleración en cierres comerciales al integrar asistencia inteligente por WhatsApp.\n` +
    `- 🏢 Rubros con mayor aceleración: Soluciones Corporativas, Arquitectura, Estética y Joyería.\n\n` +
    `Podes ver la nota de prensa y el informe interactivo completo acá:\n` +
    `👉 https://nexativanews.com.ar/prensa/estudio-servicios-2026\n\n` +
    `¿Te interesaría que te haga llegar el informe completo en PDF o coordinar una breve charla con nuestro equipo para profundizar en los datos?\n\n` +
    `Un saludo cordial,\n\n` +
    `Director de PR & Growth\n` +
    `Nexativa News | nexativanews.com.ar\n` +
    `prensa@nexativanews.com.ar`;

  return {
    journalist: target,
    subject,
    body,
    followUpMaxAllowed: 2,
  };
}

