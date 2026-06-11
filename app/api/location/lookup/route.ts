import { NextResponse } from "next/server";
import { askJson } from "@/lib/anthropic";

export const maxDuration = 30;

interface LocationData {
  medianIncome: number | null;
  population1mi: number | null;
  population3mi: number | null;
  population5mi: number | null;
  dailyTraffic: number | null;
  notes: string;
}

export async function POST(req: Request) {
  try {
    const { location } = await req.json();
    if (!location?.trim()) {
      return NextResponse.json({ error: "Location required" }, { status: 400 });
    }

    const result = await askJson<LocationData>(
      `You are a commercial real estate market analyst. Estimate realistic demographic data for this location: "${location}"

Use your knowledge of US demographics, census data, and retail market conditions. For well-known areas provide accurate estimates; for less-known areas provide reasonable regional estimates.

Return JSON only — numbers only, no strings:
{
  "medianIncome": estimated median household income in dollars (integer),
  "population1mi": estimated population within 1 mile (integer),
  "population3mi": estimated population within 3 miles (integer),
  "population5mi": estimated population within 5 miles (integer),
  "dailyTraffic": estimated daily vehicle count on primary road (integer, typical retail corridor),
  "notes": "1-2 sentence note on the market character and data confidence"
}

If this is a zip code, city, neighborhood, or intersection, use your best knowledge. Return null for fields you cannot reasonably estimate.`,
      { maxTokens: 400 }
    );

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
