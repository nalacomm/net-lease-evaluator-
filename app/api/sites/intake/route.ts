import { NextResponse } from "next/server";
import { askJson } from "@/lib/anthropic";
import { humanizeAiError } from "@/lib/ai-error";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export const maxDuration = 60;

interface SiteDraft {
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  siteType: string | null;
  squareFeet: number | null;
  parkingSpaces: number | null;
  parkingRatio: number | null;
  askingRentPsf: number | null;
  nnnEstimate: number | null;
  leaseType: string | null;
  leaseTermOffered: number | null;
  dailyTraffic: number | null;
  population1mi: number | null;
  population3mi: number | null;
  population5mi: number | null;
  medianIncome: number | null;
  coTenants: string | null;
  zoning: string | null;
  availableDate: string | null;
  source: string | null;
  brokerName: string | null;
  brokerEmail: string | null;
  brokerPhone: string | null;
  notes: string | null;
  inferredFields: string[];
  confidenceLevel: string;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const text = (form.get("text") as string) ?? "";
    const files = form.getAll("files") as File[];

    let combined = text.trim();

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum file size is 5 MB. Try compressing the PDF or paste the key text instead.` },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      if (file.type === "application/pdf") {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require("pdf-parse/lib/pdf-parse.js");
          const parsed = await pdfParse(buffer);
          combined += `\n\n--- Flyer/Document: ${file.name} ---\n${parsed.text}`;
        } catch { /* skip */ }
      } else {
        combined += `\n\n--- File: ${file.name} ---\n${buffer.toString("utf-8").slice(0, 8000)}`;
      }
    }

    if (!combined.trim()) {
      return NextResponse.json({ error: "Provide text or upload a file." }, { status: 400 });
    }

    const result = await askJson<SiteDraft>(
      `You are a commercial real estate analyst extracting prospective site details from a listing, flyer, or broker email.

Extract all site information from the content below. Infer reasonable values where clearly implied.

Enums:
- siteType: "freestanding" | "endcap" | "inline" | "pad" | "strip_center" | "power_center" | "other" | null
- leaseType: "nnn" | "modified_nnn" | "gross" | null

Rules:
- name: property name or address-based name (e.g. "123 Main St Retail Space")
- askingRentPsf: annual rent per SF as number (e.g. 28 for $28/SF/yr)
- nnnEstimate: estimated NNN expenses per SF per year
- availableDate: ISO date string YYYY-MM-DD or null
- inferredFields: list every field you estimated rather than read directly
- confidenceLevel: "high" | "medium" | "low"

Return JSON only:
{
  "name": null, "address": null, "city": null, "state": null, "zip": null,
  "siteType": null, "squareFeet": null, "parkingSpaces": null, "parkingRatio": null,
  "askingRentPsf": null, "nnnEstimate": null, "leaseType": null, "leaseTermOffered": null,
  "dailyTraffic": null,
  "population1mi": null, "population3mi": null, "population5mi": null, "medianIncome": null,
  "coTenants": null, "zoning": null, "availableDate": null,
  "source": null, "brokerName": null, "brokerEmail": null, "brokerPhone": null,
  "notes": null,
  "inferredFields": [], "confidenceLevel": "low"
}

SITE CONTENT:
${combined.slice(0, 15000)}`,
      { maxTokens: 1200 }
    );

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: humanizeAiError(e) },
      { status: 500 }
    );
  }
}
