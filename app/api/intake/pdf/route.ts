import { NextResponse } from "next/server";
import { extractDealFromPdf } from "@/lib/extract";
import { humanizeAiError } from "@/lib/ai-error";

export const maxDuration = 60;

// Vercel hobby: 4.5 MB body limit. Pro: 4.5 MB default, configurable.
// Real estate OMs can be 5-20 MB — warn the user clearly instead of a cryptic error.
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB soft cap before Vercel hard-kills it

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const dealCategory = (form.get("dealCategory") as string) ?? "net_lease";
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // File size check — surface this before attempting anything
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        {
          error: `PDF is ${(file.size / 1024 / 1024).toFixed(1)} MB — too large to parse automatically (limit: 10 MB). Try copying the text from the PDF and using Text mode instead.`,
        },
        { status: 422 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Quick sanity check — verify %PDF header before sending to Claude
    const header = buffer.slice(0, 1024).toString("latin1");
    if (header.indexOf("%PDF") === -1) {
      return NextResponse.json(
        { error: "This file does not appear to be a valid PDF. Upload a .pdf file or paste the text directly." },
        { status: 422 }
      );
    }

    // Send the PDF buffer directly to Claude — no text extraction step.
    // Claude's native document API reads tables and layouts that text parsers miss.
    const result = await extractDealFromPdf(buffer, dealCategory);
    return NextResponse.json(result);
  } catch (e) {
    console.error("intake/pdf error", e);
    return NextResponse.json({ error: humanizeAiError(e) }, { status: 500 });
  }
}
