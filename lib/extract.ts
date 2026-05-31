import { askJson } from "./anthropic";

export interface ExtractedDeal {
  address: string | null;
  city: string | null;
  state: string | null;
  assetType: string | null;
  tenantName: string | null;
  operatorName: string | null;
  operatorUnitCount: number | null;
  guarantyType: string | null;
  askingPrice: number | null;
  noi: number | null;
  capRateAsking: number | null;
  leaseType: string | null;
  termRemainingYears: number | null;
  bumpStructure: string | null;
  bumpPercent: number | null;
  constructionYear: number | null;
  buildingSize: number | null;
  hhi1Mile: number | null;
  hhi3Mile: number | null;
  population1Mile: number | null;
  sourceBroker: string | null;
  sourcePlatform: string | null;
}

export interface ExtractResult {
  deal: ExtractedDeal;
  inferredFields: string[];
  missingFields: string[];
  confidenceLevel: "high" | "medium" | "low";
  notes: string;
}

const SYSTEM = `You are a commercial real estate net-lease analyst. Extract structured deal data from listing text. Return ONLY valid JSON, no prose, no markdown fences.`;

export async function extractDeal(content: string): Promise<ExtractResult> {
  const prompt = `Extract net lease deal fields from the source below.

Enums:
- assetType: one of "eclc","qsr","pharmacy","medical","dollar_store","retail","restaurant","other"
- leaseType: one of "absolute_nnn","nnn","modified_nnn","gross"
- guarantyType: one of "corporate","multi_unit_franchisee","single_personal"
- sourcePlatform: one of "costar","loopnet","crexi","direct","other"

Rules:
- Numbers only for money/percent fields (no $ or % symbols). capRateAsking and bumpPercent as plain numbers (e.g. 7.5 means 7.5%).
- Use null for anything not present. Do not invent values.
- termRemainingYears may be derived from lease expiration vs today; if so list it in inferredFields.
- Track which fields were INFERRED (not explicitly stated) and which key fields are MISSING.
- confidenceLevel: "high" if all key fields (price, noi/capRate, leaseType, term, guaranty) are explicit; "medium" if 1-2 inferred; "low" if 3+ inferred or missing.

Return JSON exactly:
{
  "deal": {
    "address": null, "city": null, "state": null, "assetType": null,
    "tenantName": null, "operatorName": null, "operatorUnitCount": null, "guarantyType": null,
    "askingPrice": null, "noi": null, "capRateAsking": null,
    "leaseType": null, "termRemainingYears": null, "bumpStructure": null, "bumpPercent": null,
    "constructionYear": null, "buildingSize": null,
    "hhi1Mile": null, "hhi3Mile": null, "population1Mile": null,
    "sourceBroker": null, "sourcePlatform": null
  },
  "inferredFields": [],
  "missingFields": [],
  "confidenceLevel": "low",
  "notes": ""
}

SOURCE:
${content.slice(0, 12000)}`;

  return askJson<ExtractResult>(prompt, { system: SYSTEM, maxTokens: 1500 });
}
