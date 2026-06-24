import { NextResponse } from "next/server";
import { askJson } from "@/lib/anthropic";
import type { PdfAnalysisResult } from "@/app/api/news/analyze-pdf/route";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "Text content required" }, { status: 400 });
    }

    const truncated = text.length > 18000 ? text.slice(0, 18000) + "\n\n[... truncated ...]" : text;

    const result = await askJson<PdfAnalysisResult>(
      `You are a commercial real estate analyst extracting structured intelligence from market content.

Extract all relevant information and return it as JSON matching this exact schema.

Content:
---
${truncated}
---

Return JSON only, no preamble:
{
  "headline": "Concise title for this content (under 120 chars)",
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

    return NextResponse.json({ ...result, rawContent: text.slice(0, 50000) });
  } catch (e) {
    console.error("analyze-text error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to analyze text" },
      { status: 500 }
    );
  }
}
