import { NextResponse } from "next/server";
import { askJson } from "@/lib/anthropic";

export const maxDuration = 60;

interface RequirementsDraft {
  minSF: number | null;
  maxSF: number | null;
  preferredSF: number | null;
  minRentPsf: number | null;
  maxRentPsf: number | null;
  leaseType: string | null;
  minParking: number | null;
  minTraffic: number | null;
  minPopulation: number | null;
  minIncome: number | null;
  radiusMiles: number | null;
  minTerm: number | null;
  preferredTerm: number | null;
  targetMarkets: string[];
  coTenancy: string | null;
  exclusivity: string | null;
  zoningReqs: string | null;
  siteTypePrefs: string[];
  additionalNotes: string | null;
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

    let combinedContext = narrative.trim();

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (file.type === "application/pdf") {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require("pdf-parse/lib/pdf-parse.js");
          const parsed = await pdfParse(buffer);
          combinedContext += `\n\n--- Document: ${file.name} ---\n${parsed.text}`;
        } catch { /* skip unreadable */ }
      } else {
        combinedContext += `\n\n--- Document: ${file.name} ---\n${buffer.toString("utf-8").slice(0, 5000)}`;
      }
    }

    if (!combinedContext.trim()) {
      return NextResponse.json({ error: "Provide a narrative or upload documents." }, { status: 400 });
    }

    const result = await askJson<RequirementsDraft>(
      `You are a commercial real estate tenant rep analyst building a site requirement profile from a tenant description.

Extract site requirements from the description below. Use reasonable retail/restaurant CRE defaults for anything not stated. Infer when reasonable; note inferred fields.

Enums:
- leaseType: "nnn" | "modified_nnn" | "gross" | null
- siteTypePrefs: array of "freestanding" | "endcap" | "inline" | "pad" | "strip_center" | "power_center" | "other"
- targetMarkets: array of city or metro names (e.g. ["Baltimore", "Annapolis", "Northern Virginia"])

Rules:
- minSF / maxSF: square footage as numbers
- minRentPsf / maxRentPsf: annual rent per SF as number (e.g. 28 for $28/SF/yr)
- minTraffic: minimum daily vehicle count as integer
- minIncome: minimum median household income as integer (e.g. 75000)
- minPopulation: minimum population within radius as integer
- radiusMiles: demographic radius (default 3 if not stated)
- inferredFields: list every field you inferred
- missingFields: list key fields still unknown
- confidenceLevel: "high" | "medium" | "low"
- narrativeSummary: 1-2 sentence summary of this tenant's site thesis

Return JSON only:
{
  "minSF": null, "maxSF": null, "preferredSF": null,
  "minRentPsf": null, "maxRentPsf": null, "leaseType": null,
  "minParking": null, "minTraffic": null, "minPopulation": null,
  "minIncome": null, "radiusMiles": 3,
  "minTerm": null, "preferredTerm": null,
  "targetMarkets": [], "siteTypePrefs": [],
  "coTenancy": null, "exclusivity": null, "zoningReqs": null,
  "additionalNotes": null,
  "inferredFields": [], "missingFields": [], "confidenceLevel": "low",
  "narrativeSummary": ""
}

TENANT DESCRIPTION:
${combinedContext.slice(0, 15000)}`,
      { maxTokens: 1200 }
    );

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
