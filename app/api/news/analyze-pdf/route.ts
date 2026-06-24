import { NextResponse } from "next/server";
import { askJson } from "@/lib/anthropic";

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

    const result = await askJson<PdfAnalysisResult>(
      `You are a commercial real estate analyst extracting structured intelligence from a market report or news document.

Extract all relevant information and return it as JSON matching this exact schema. Every field is required unless marked optional.

Document text:
---
${truncated}
---

Return JSON only, no preamble:
{
  "headline": "Concise title for this report/article (under 120 chars)",
  "summary": "2-3 sentence summary of the key findings",
  "source": "Publisher or author name, or null if unknown",
  "publishedAt": "YYYY-MM-DD format only (e.g. 2025-01-15), or null — do NOT return a year alone or a partial date",
  "category": "One of: interest_rates | cap_rates | tenant_credit | sector_news | market | other",
  "insights": [
    {
      "type": "cap_rate | tenant_expansion | market_data | demographics | interest_rates | regulatory | credit_rating | other",
      "title": "Short title (under 60 chars)",
      "detail": "What was found — be specific, include numbers if present",
      "relevantTo": ["investors", "tenants", "sites", "deals"],
      "dataPoints": "Key numbers, ranges, or metrics mentioned (optional)"
    }
  ]
}

Guidelines for insights:
- Extract up to 8 insights. Only include genuinely actionable or notable findings.
- cap_rate: any cap rate ranges, trends, compression/expansion signals
- tenant_expansion: specific tenant brands expanding, contracting, or changing formats
- market_data: market-wide trends, transaction volume, vacancy rates, rents
- demographics: population, income, traffic, or consumer spending data
- interest_rates: Fed policy, SOFR, DSCR impacts, financing trends
- regulatory: zoning changes, tax law, 1031 exchange rules, opportunity zones
- credit_rating: tenant or REIT credit rating changes, bankruptcy risk signals
- other: any other relevant finding
- relevantTo: include only the entries that apply — valid values are "investors", "tenants", "sites", "deals". Must be a proper JSON array`,
      { maxTokens: 1500 }
    );

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
