import { NextResponse } from "next/server";
import { askText } from "@/lib/anthropic";
import { buildAnalysisPrompt, parseAndNormalizeAnalysis } from "@/lib/parse-analysis";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "Text content required" }, { status: 400 });
    }

    const truncated = text.length > 18000 ? text.slice(0, 18000) + "\n\n[... truncated ...]" : text;
    const raw = await askText(buildAnalysisPrompt(truncated), { maxTokens: 1500 });
    const result = parseAndNormalizeAnalysis(raw);

    return NextResponse.json({ ...result, rawContent: text.slice(0, 50000) });
  } catch (e) {
    console.error("analyze-text error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to analyze text" },
      { status: 500 }
    );
  }
}
