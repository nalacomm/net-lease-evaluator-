import { NextResponse } from "next/server";
import { extractDeal } from "@/lib/extract";
import { humanizeAiError } from "@/lib/ai-error";

export const maxDuration = 60;

// Vercel hobby: 4.5 MB body limit. Pro: 4.5 MB default, configurable.
// Real estate OMs can be 5-20 MB — warn the user clearly instead of a cryptic error.
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB soft cap before Vercel hard-kills it

export async function POST(req: Request) {
  try {
    const form = await req.formData();
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

    // Verify it starts with %PDF before handing to parser
    const header = buffer.slice(0, 1024).toString("latin1");
    const pdfStart = header.indexOf("%PDF");
    if (pdfStart === -1) {
      return NextResponse.json(
        { error: "This file does not appear to be a valid PDF. Upload a .pdf file or paste the text directly." },
        { status: 422 }
      );
    }

    // Trim any leading junk bytes before %PDF (some PDFs have a BOM or pre-header content)
    const cleanBuffer = pdfStart > 0 ? buffer.slice(pdfStart) : buffer;

    let text = "";
    try {
      // Import lib/pdf-parse directly — bypasses the index.js test-file loading
      // that fails when Next.js bundles the module (uses fs internally)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse.js");
      const parsed = await pdfParse(cleanBuffer);
      text = parsed.text?.trim() ?? "";
    } catch (pdfErr) {
      console.warn("pdf-parse failed:", pdfErr);
      return NextResponse.json(
        {
          error:
            "This PDF format could not be parsed (may be encrypted, scanned, or form-based). Copy the text from the PDF and use Text mode instead.",
        },
        { status: 422 }
      );
    }

    if (!text || text.length < 10) {
      return NextResponse.json(
        {
          error:
            "No readable text found in this PDF — it may be a scanned image. Copy the text manually and use Text mode.",
        },
        { status: 422 }
      );
    }

    const result = await extractDeal(text);
    return NextResponse.json(result);
  } catch (e) {
    console.error("intake/pdf error", e);
    return NextResponse.json({ error: humanizeAiError(e) }, { status: 500 });
  }
}
