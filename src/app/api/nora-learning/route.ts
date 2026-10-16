import { NextResponse } from "next/server";
import {
  getGlobalLearningSummary,
  getGlobalLearningCollection,
  recordLearnedInsight,
  updateLearningSummary,
  NoraLearnedInsight,
} from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  try {
    const summary = await getGlobalLearningSummary("nora-prensa");
    const col = await getGlobalLearningCollection();
    const doc = col ? await col.findOne({ agentId: "nora-prensa" }) : null;

    return NextResponse.json({
      ok: true,
      agentId: "nora-prensa",
      totalInteractions: doc?.totalInteractions || 0,
      updatedAt: doc?.updatedAt || null,
      summaryPrompt: summary,
      insightsCount: doc?.insights?.length || 0,
      recentInsights: doc?.insights?.slice(-15) || [],
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
    return NextResponse.json({ ok: saved, insight: newInsight });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Error registrando insight de aprendizaje" },
      { status: 500 }
    );
  }
}
