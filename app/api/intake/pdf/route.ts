import { NextResponse } from "next/server";
import { extractDeal } from "@/lib/extract";
import { humanizeAiError } from "@/lib/ai-error";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    let dealCategory = "net_lease";
    let pdfBuffer: Buffer | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      dealCategory = (form.get("dealCategory") as string | null) ?? "net_lease";
      const file = form.get("file") as File | null;
      if (!file || file.size === 0) {
        return NextResponse.json({ error: "No PDF file received." }, { status: 400 });
      }
      pdfBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      // Legacy base64 JSON path — kept for backward compatibility
      const body = await req.json() as { pdfBase64?: string; dealCategory?: string };
      dealCategory = body.dealCategory ?? "net_lease";
      if (!body.pdfBase64) {
        return NextResponse.json({ error: "No PDF data received." }, { status: 400 });
      }
      pdfBuffer = Buffer.from(body.pdfBase64, "base64");
    }

    const pdfParse = (await import("pdf-parse")).default;
    let text = "";
    try {
      const parsed = await pdfParse(pdfBuffer);
      text = parsed.text ?? "";
    } catch {
      return NextResponse.json(
        { error: "Could not read this PDF. Try copying the key pages (executive summary, offering summary, lease abstract) as text and use Text mode instead." },
        { status: 422 }
      );
    }

    if (text.trim().length < 100) {
      return NextResponse.json(
        { error: "This PDF appears to be image-based and has no extractable text. Copy the key pages as text and use Text mode instead." },
        { status: 422 }
      );
    }

    const result = await extractDeal(text, dealCategory);
    return NextResponse.json(result);
  } catch (e) {
    console.error("intake/pdf error", e);
    return NextResponse.json({ error: humanizeAiError(e) }, { status: 500 });
  }
}
