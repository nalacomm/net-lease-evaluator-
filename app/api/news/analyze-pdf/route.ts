import { NextResponse } from "next/server";
import { askText } from "@/lib/anthropic";
import { parseAndNormalizeAnalysis } from "@/lib/parse-analysis";
import { buildPrompt } from "@/app/api/news/analyze-text/route";

export const maxDuration = 120;

const MAX_FILE_BYTES = 10 * 1024 * 1024;

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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const parsed = await pdfParse(buffer);
    const rawText: string = parsed.text ?? "";

    if (!rawText.trim()) {
      return NextResponse.json({ error: "Could not extract text from this PDF. It may be a scanned image." }, { status: 422 });
    }

    // For large documents, take the first 12k + last 4k chars — captures intro/exec summary and conclusion
    let truncated: string;
    if (rawText.length > 16000) {
      truncated = rawText.slice(0, 12000) + "\n\n[... middle sections omitted ...]\n\n" + rawText.slice(-4000);
    } else {
      truncated = rawText;
    }

    const raw = await askText(buildPrompt(truncated), { maxTokens: 1500 });
    const result = parseAndNormalizeAnalysis(raw);

    return NextResponse.json({
      ...result,
      rawContent: rawText.slice(0, 50000),
    });
  } catch (e) {
    console.error("analyze-pdf error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to analyze PDF" },
      { status: 500 }
    );
  }
}
