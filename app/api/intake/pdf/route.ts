import { NextResponse } from "next/server";
import { extractDeal } from "@/lib/extract";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    // pdf-parse is CommonJS; import lazily to avoid bundling issues.
    let text = "";
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(buffer);
      text = parsed.text?.trim() ?? "";
    } catch (pdfErr) {
      // pdf-parse fails on some PDF structures (forms, encrypted, complex XFA)
      console.warn("pdf-parse failed:", pdfErr);
      return NextResponse.json(
        {
          error:
            "This PDF could not be parsed automatically (complex format or form-based PDF). Copy the text from the PDF and use Text mode instead.",
        },
        { status: 422 }
      );
    }

    if (!text || text.length < 10) {
      return NextResponse.json(
        {
          error:
            "No readable text found in this PDF. It may be a scanned image. Copy the text manually and use Text mode.",
        },
        { status: 422 }
      );
    }
    const result = await extractDeal(text);
    return NextResponse.json(result);
  } catch (e) {
    console.error("intake/pdf error", e);
    const msg = e instanceof Error ? e.message : "PDF parse failed";
    // Surface Anthropic credit/quota errors clearly
    const userMsg = msg.includes("credit") || msg.includes("quota") || msg.includes("billing")
      ? "Claude API credits exhausted. Add credits at console.anthropic.com, then try again."
      : msg.includes("API key")
      ? "Anthropic API key is invalid or missing."
      : msg;
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
