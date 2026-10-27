import { NextResponse } from "next/server";
import {
  getGlobalLearningSummary,
  getGlobalLearningCollection,
  recordLearnedInsight,
  updateLearningSummary,
  NoraLearnedInsight,
} from "@/lib/mongodb";

export const runtime = "nodejs";

let noraLearningCache: { data: any; expiresAt: number } | null = null;
const LEARNING_CACHE_TTL_MS = 20 * 1000;

export async function GET() {
  try {
    const now = Date.now();
    if (noraLearningCache && noraLearningCache.expiresAt > now) {
      return NextResponse.json(noraLearningCache.data, {
        headers: {
          "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40",
          "X-Cache": "HIT",
        },
      });
    }

    const col = await getGlobalLearningCollection();
    const doc = col ? await col.findOne({ agentId: "nora-prensa" }) : null;

    const payload = {
      ok: true,
      agentId: "nora-prensa",
      totalInteractions: doc?.totalInteractions || 0,
      updatedAt: doc?.updatedAt || null,
      summaryPrompt: doc?.summaryPrompt || "",
      insightsCount: doc?.insights?.length || 0,
      recentInsights: doc?.insights?.slice(-15) || [],
    };

    noraLearningCache = { data: payload, expiresAt: now + LEARNING_CACHE_TTL_MS };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40",
        "X-Cache": "MISS",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Error al obtener memoria de aprendizaje" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, insight, category = "editorial", summaryPrompt } = body;

    if (summaryPrompt && typeof summaryPrompt === "string") {
      await updateLearningSummary(summaryPrompt, "nora-prensa");
      noraLearningCache = null;
      return NextResponse.json({ ok: true, message: "Resumen de memoria editorial actualizado exitosamente" });
    }

    if (!topic || !insight) {
      return NextResponse.json(
        { ok: false, error: "Se requieren 'topic' e 'insight'" },
        { status: 400 }
      );
    }

    const newInsight: NoraLearnedInsight = {
      topic,
      insight,
      category,
      createdAt: new Date().toISOString(),
      sourceContext: body.sourceContext || "Interacción editorial",
    };

    const saved = await recordLearnedInsight(newInsight, "nora-prensa");
    if (saved) noraLearningCache = null;
    return NextResponse.json({ ok: saved, insight: newInsight });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Error registrando insight de aprendizaje" },
      { status: 500 }
    );
  }
}
