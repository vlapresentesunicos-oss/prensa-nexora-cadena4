import { NextResponse } from "next/server";
import { getGroqClient, GROQ_MODELS } from "@/lib/groq";
import { generateContentWithGeminiFallback } from "@/lib/gemini";
import { publishToInstagram, publishToFacebookPage } from "@/lib/connectors/meta";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, title, excerpt = "", imageUrl, caption } = body;

    // A. Generar Copy Viral con Nora en Español Neutro Latino
    if (action === "generate_copy" || (!action && !caption)) {
      const prompt = `
Actúa como la Community Manager Jefa de Cadena 4 para Prensa NexoraOne.
Escribe UN solo post (copy) periodístico cautivador, asertivo y de alto impacto para redes sociales (Instagram, Facebook y X) sobre la siguiente noticia.

REGLAS DE ORO:
1. Habla estrictamente en ESPAÑOL NEUTRO LATINO internacional (cero modismos locales o regionalismos).
2. Usa emojis elegantes y pertinentes.
3. Incluye llamados a la lectura y hashtags neutrales (#Noticias #Actualidad #Cadena4 #PrensaNexoraOne).

Título: ${title}
Resumen: ${excerpt}
`;
      let copyText = `📢 ÚLTIMA HORA • CADENA 4\n\n${title}\n\n${excerpt}\n\n👉 Conozca todos los detalles de esta noticia en desarrollo.\n\n#Noticias #Actualidad #Cadena4`;

      const groq = getGroqClient();
      if (groq) {
        try {
          const comp = await groq.chat.completions.create({
            model: GROQ_MODELS.text,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.6,
            max_tokens: 500,
          });
          const text = comp.choices[0]?.message?.content?.trim();
          if (text) copyText = text;
        } catch (e) {
          try {
            const geminiText = await generateContentWithGeminiFallback([{ text: prompt }]);
            if (geminiText) copyText = geminiText;
          } catch (g) {}
        }
      }

      return NextResponse.json({ success: true, copy: copyText });
    }

    // B. Publicación Directa a Meta
    const finalCaption = caption || `📢 ${title}\n\n${excerpt}`;
    const results: any = {};

    if (imageUrl) {
      results.instagram = await publishToInstagram({ caption: finalCaption, imageUrl }, body.metaConfig);
    }
    results.facebook = await publishToFacebookPage({ caption: finalCaption, imageUrl }, body.metaConfig);

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
