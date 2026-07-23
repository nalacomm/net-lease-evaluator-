import { NextResponse } from "next/server";
import { askJson } from "@/lib/anthropic";
import { extractDeal } from "@/lib/extract";

export const maxDuration = 60;

interface BuyBoxDraft {
  capRateMin: number | null;
  capRateTarget: number | null;
  priceMax: number | null;
  priceStretch: number | null;
  leaseTypePreferred: string | null;
  leaseTypeAcceptable: string | null;
  termMinYears: number | null;
  termPreferredYears: number | null;
  bumpMinPercent: number | null;
  bumpAltStructure: string | null;
  flatLeaseAllowed: boolean;
  guarantyPreferred: string | null;
  guarantyAcceptable: string | null;
  guarantyFloor: string | null;
  operatorMinUnits: number | null;
  dscrMin: number | null;
  ltv: number | null;
  interestRate: number | null;
  amortizationYears: number | null;
  hhiMin: number | null;
  assetTypesPreferred: string[];
  assetTypesAcceptable: string[];
  preferredStates: string[];
  targetMarkets: string[];
  currentMonthlyIncome: number | null;
  notes: string | null;
  inferredFields: string[];
  missingFields: string[];
  confidenceLevel: string;
  narrativeSummary: string;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const narrative = (form.get("narrative") as string) ?? "";
    const files = form.getAll("files") as File[];

    // Extract text from any uploaded files
    let combinedContext = narrative.trim();

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (file.type === "application/pdf") {
        try {
          const pdfParse = (await import("pdf-parse")).default;
          const parsed = await pdfParse(buffer);
          combinedContext += `\n\n--- Document: ${file.name} ---\n${parsed.text}`;
        } catch {
          // Skip unreadable PDFs
        }
      } else {
        // Try reading as plain text (e.g. bank approval letters saved as txt)
        combinedContext += `\n\n--- Document: ${file.name} ---\n${buffer.toString("utf-8").slice(0, 5000)}`;
      }
    }

    if (!combinedContext.trim()) {
      return NextResponse.json({ error: "Provide a narrative or upload documents." }, { status: 400 });
    }

    const result = await askJson<BuyBoxDraft>(
      `You are a commercial real estate analyst building an investor buy box from a narrative description.

Extract buy box parameters from the investor description below. Use reasonable CRE market defaults for anything not stated (e.g. 7% interest rate, 25-year amortization, 65% LTV, 1.35x DSCR floor). Infer when reasonable; note inferred fields.

Enums:
- leaseTypePreferred / leaseTypeAcceptable: "absolute_nnn" | "nnn" | "modified_nnn" | "gross"
- guarantyPreferred / guarantyAcceptable / guarantyFloor: "corporate" | "multi_unit_franchisee" | "single_personal"
- assetTypesPreferred / assetTypesAcceptable: array of: "eclc" | "qsr" | "pharmacy" | "medical" | "dollar_store" | "retail" | "shopping_center" | "restaurant" | "other"
- preferredStates: array of uppercase state abbreviations (e.g. ["DC", "MD", "VA"])
- targetMarkets: array of city/metro names (e.g. ["Washington", "Baltimore"])
- ltv: fraction (e.g. 0.65 for 65%)

Rules:
- priceMax / priceStretch: raw dollar number (no commas/symbols)
- capRateMin / capRateTarget: percent as number (e.g. 6.75)
- If bank pre-approval is mentioned, use that as priceMax
- inferredFields: list every field you inferred rather than read explicitly
- missingFields: list key fields still unknown
- confidenceLevel: "high" (most key fields explicit), "medium" (several inferred), "low" (mostly inferred)
- narrativeSummary: 1-2 sentence plain-language summary of this investor's thesis

Return JSON only:
{
  "capRateMin": null, "capRateTarget": null, "priceMax": null, "priceStretch": null,
  "leaseTypePreferred": null, "leaseTypeAcceptable": null,
  "termMinYears": null, "termPreferredYears": null,
  "bumpMinPercent": null, "bumpAltStructure": null, "flatLeaseAllowed": false,
  "guarantyPreferred": null, "guarantyAcceptable": null, "guarantyFloor": null,
  "operatorMinUnits": null,
  "dscrMin": null, "ltv": null, "interestRate": null, "amortizationYears": null,
  "hhiMin": null,
  "assetTypesPreferred": [], "assetTypesAcceptable": [],
  "preferredStates": [], "targetMarkets": [],
  "currentMonthlyIncome": null, "notes": null,
  "inferredFields": [], "missingFields": [], "confidenceLevel": "low",
  "narrativeSummary": ""
}

INVESTOR DESCRIPTION:
${combinedContext.slice(0, 15000)}`,
      { maxTokens: 1200 }
    );

    return NextResponse.json(result);
  } catch (e) {
    console.error("buybox/wizard error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
