import type { PdfAnalysisResult, PdfInsight } from "@/app/api/news/analyze-pdf/route";

export function buildAnalysisPrompt(content: string): string {
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

const VALID_RELEVANT = new Set(["investors", "tenants", "sites", "deals"]);

function toRelevantTo(val: unknown): PdfInsight["relevantTo"] {
  if (Array.isArray(val)) {
    return val.filter((v): v is string => typeof v === "string" && VALID_RELEVANT.has(v)) as PdfInsight["relevantTo"];
  }
  if (typeof val === "string") {
    return val.split(/[\s,]+/).filter((v) => VALID_RELEVANT.has(v)) as PdfInsight["relevantTo"];
  }
  return [];
}

// Attempt to repair and parse a potentially malformed JSON string from the AI.
function repairAndParse(raw: string): Record<string, unknown> {
  let text = raw.trim();

  // Strip markdown code fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  // Extract first {...} block
  if (!text.startsWith("{")) {
    const obj = text.match(/\{[\s\S]*\}/);
    if (obj) text = obj[0];
  }

  // Remove trailing commas before } or ]
  text = text.replace(/,(\s*[}\]])/g, "$1");

  try {
    return JSON.parse(text);
  } catch {
    // Last resort: truncate at the last complete top-level field before the error
    const lastBrace = text.lastIndexOf('"}');
    if (lastBrace > 0) {
      const trimmed = text.slice(0, lastBrace + 2) + "]}";
      try {
        return JSON.parse(trimmed);
      } catch { /* fall through */ }
    }
    throw new Error("Could not parse AI response as JSON");
  }
}

export function parseAndNormalizeAnalysis(raw: string): PdfAnalysisResult {
  const data = repairAndParse(raw);

  const rawInsights = Array.isArray(data.insights) ? data.insights : [];
  const insights: PdfInsight[] = rawInsights.map((ins: Record<string, unknown>) => ({
    type: (ins.type as PdfInsight["type"]) ?? "other",
    title: String(ins.title ?? ""),
    detail: String(ins.detail ?? ""),
    relevantTo: toRelevantTo(ins.relevantTo),
    dataPoints: ins.dataPoints ? String(ins.dataPoints) : undefined,
  }));

  return {
    headline: String(data.headline ?? ""),
    summary: String(data.summary ?? ""),
    source: data.source ? String(data.source) : null,
    publishedAt: (() => {
      const d = String(data.publishedAt ?? "");
      return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
    })(),
    category: String(data.category ?? "other"),
    insights,
    rawContent: "",
  };
}
