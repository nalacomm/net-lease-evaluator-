import { NextResponse } from "next/server";
import { askTextWithDocument } from "@/lib/anthropic";
import { ANALYSIS_SYSTEM, buildAnalysisPrompt, parseAndNormalizeAnalysis } from "@/lib/parse-analysis";

export const maxDuration = 120;

const MAX_FILE_BYTES = 30 * 1024 * 1024;

export type PdfInsight = {
  type: "cap_rate" | "tenant_expansion" | "market_data" | "demographics" | "interest_rates" | "regulatory" | "credit_rating" | "other";
  title: string;
  detail: string;
  relevantTo: ("investors" | "tenants" | "sites" | "deals")[];
  dataPoints?: string;
};

export type PdfAnalysisResult = {
  headline: string;
  summary: string;
  source: string | null;
  publishedAt: string | null;
  category: string;
  insights: PdfInsight[];
  rawContent: string;
};

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "PDF file required" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `File too large. Maximum is ${MAX_FILE_BYTES / 1024 / 1024} MB.` }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }

    const pdfBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");

    // Use Claude's native document API — handles modern PDFs, scanned layouts, tables
    const raw = await askTextWithDocument(
      pdfBase64,
      buildAnalysisPrompt("(see attached PDF document above)"),
      { system: ANALYSIS_SYSTEM, maxTokens: 1500 }
    );
    const result = parseAndNormalizeAnalysis(raw);

    return NextResponse.json({
      ...result,
      rawContent: "",
    });
  } catch (e) {
    console.error("analyze-pdf error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to analyze PDF" },
      { status: 500 }
    );
  }
}
