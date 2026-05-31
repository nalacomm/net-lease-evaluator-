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
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    const text = parsed.text?.trim();
    if (!text || text.length < 10) {
      return NextResponse.json(
        { error: "Could not extract text from PDF (may be scanned/image-only)." },
        { status: 422 }
      );
    }
    const result = await extractDeal(text);
    return NextResponse.json(result);
  } catch (e) {
    console.error("intake/pdf error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "PDF parse failed" },
      { status: 500 }
    );
  }
}
