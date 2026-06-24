import type { PdfAnalysisResult, PdfInsight } from "@/app/api/news/analyze-pdf/route";

export const ANALYSIS_SYSTEM =
  "You are a JSON API. You MUST return only a valid JSON object — no explanation, no preamble, no markdown, no code fences. Even if the content has no relevant data, return the JSON object with empty or null fields.";

export function buildAnalysisPrompt(content: string): string {
  return `Extract commercial real estate intelligence from the content below and return it as a JSON object matching this exact schema. If the content has no CRE relevance, still return the JSON with an empty insights array and a brief summary of what the content is.

Content:
---
${content}
---

Required schema — return ONLY this JSON, nothing else:
{
  "headline": "concise title under 120 chars",
  "summary": "2-3 sentences describing the content and any CRE relevance",
  "source": null,
  "publishedAt": null,
  "category": "other",
  "insights": []
}

If CRE insights exist, populate insights as objects with these fields:
- type: one of cap_rate, tenant_expansion, market_data, demographics, interest_rates, regulatory, credit_rating, other
- title: string under 60 chars
- detail: specific finding with numbers if present
- relevantTo: comma-separated string using only these words: investors, tenants, sites, deals
- dataPoints: string with key metrics, or null

Return at most 8 insights. relevantTo must be a plain comma-separated string, not an array. All strings must be properly JSON-escaped.`;
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
    // Try truncating at the last complete insight object
    const lastClose = text.lastIndexOf("}");
    if (lastClose > 0) {
      const trimmed = text.slice(0, lastClose + 1);
      // Try wrapping as complete object if insights array was cut off
      const insightsIdx = trimmed.indexOf('"insights"');
      if (insightsIdx > 0) {
        const attempt = trimmed + "]}";
        try { return JSON.parse(attempt); } catch { /* fall through */ }
      }
      try { return JSON.parse(trimmed); } catch { /* fall through */ }
    }
    // If all else fails, return a minimal shell so the user still sees the form
    return { headline: "", summary: "AI returned an unreadable response. Fill in details manually.", source: null, publishedAt: null, category: "other", insights: [] };
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
