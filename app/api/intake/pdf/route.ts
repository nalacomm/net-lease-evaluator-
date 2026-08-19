import { NextResponse } from "next/server";
import { extractDealFromPdf } from "@/lib/extract";
import { humanizeAiError } from "@/lib/ai-error";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json() as { pdfBase64?: string; dealCategory?: string };
    const { pdfBase64, dealCategory = "net_lease" } = body;

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return NextResponse.json({ error: "No PDF data received." }, { status: 400 });
    }

    // Size guard: base64 is ~4/3 the original size; 10 MB PDF ≈ 13.3 MB base64
    if (pdfBase64.length > 14_000_000) {
      return NextResponse.json(
        { error: "PDF is too large to process (limit ~10 MB). Try copying the key pages as text instead." },
        { status: 422 }
      );
    }

    const result = await extractDealFromPdf(pdfBase64, dealCategory);
    return NextResponse.json(result);
  } catch (e) {
    console.error("intake/pdf error", e);
    return NextResponse.json({ error: humanizeAiError(e) }, { status: 500 });
  }
}
