import { NextResponse } from "next/server";
import { askText } from "@/lib/anthropic";
import { parseAndNormalizeAnalysis } from "@/lib/parse-analysis";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "Text content required" }, { status: 400 });
    }

    const truncated = text.length > 18000 ? text.slice(0, 18000) + "\n\n[... truncated ...]" : text;
    const raw = await askText(buildPrompt(truncated), { maxTokens: 1500 });
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

export function buildPrompt(content: string): string {
  return `You are a commercial real estate analyst. Extract structured intelligence from the content below and return ONLY a valid JSON object — no explanation, no markdown, no code fences.

Content:
---
${content}
---

JSON schema (follow exactly — every string value must use double quotes and be properly escaped):
{
  "headline": "string — concise title under 120 chars",
  "summary": "string — 2-3 sentence summary of key findings",
  "source": "string or null — publisher or author name",
  "publishedAt": "string or null — YYYY-MM-DD only, e.g. 2025-01-15. Return null if unknown or if the date is not a full calendar date",
  "category": "string — one of: interest_rates, cap_rates, tenant_credit, sector_news, market, other",
  "insights": [
    {
      "type": "string — one of: cap_rate, tenant_expansion, market_data, demographics, interest_rates, regulatory, credit_rating, other",
      "title": "string — under 60 chars",
      "detail": "string — specific finding, include numbers if present",
      "relevantTo": "string — comma-separated subset of: investors, tenants, sites, deals",
      "dataPoints": "string or null — key metrics or numbers"
    }
  ]
}

Rules:
- Return at most 8 insights. Only include genuinely notable or actionable findings.
- If there are no CRE-relevant insights, return an empty insights array.
- All string values must be properly JSON-escaped. No unquoted text inside strings.
- relevantTo must be a plain string like "investors, tenants" — NOT an array.`;
}
