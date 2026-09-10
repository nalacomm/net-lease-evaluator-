import { NextResponse } from "next/server";
import { extractDealFromPdf } from "@/lib/extract";
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
      if (file.size > 30 * 1024 * 1024) {
        return NextResponse.json(
          { error: `This PDF is ${(file.size / 1024 / 1024).toFixed(1)} MB — too large (limit 30 MB). Try a compressed version or paste key pages as text.` },
          { status: 422 }
        );
      }
      pdfBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      // Legacy base64 JSON path
      const body = await req.json() as { pdfBase64?: string; dealCategory?: string };
      dealCategory = body.dealCategory ?? "net_lease";
      if (!body.pdfBase64) {
        return NextResponse.json({ error: "No PDF data received." }, { status: 400 });
      }
      pdfBuffer = Buffer.from(body.pdfBase64, "base64");
    }

    // Convert buffer to base64 server-side and use Claude's native document API —
    // avoids pdf-parse compatibility issues and gets visual layout understanding.
    const pdfBase64 = pdfBuffer.toString("base64");
    const result = await extractDealFromPdf(pdfBase64, dealCategory);
    return NextResponse.json(result);
  } catch (e) {
    console.error("intake/pdf error", e);
    return NextResponse.json({ error: humanizeAiError(e) }, { status: 500 });
  }
}
