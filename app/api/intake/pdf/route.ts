import { NextResponse } from "next/server";
import { extractDealFromPdf } from "@/lib/extract";
import { humanizeAiError } from "@/lib/ai-error";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const contentType = req.headers.get("content-type") ?? "";

    let dealCategory = "net_lease";
    let pdfBuffer: Buffer;

    if (contentType.includes("application/pdf") || contentType.includes("application/octet-stream")) {
      // Raw binary upload — bypasses multipart parser entirely
      dealCategory = url.searchParams.get("dealCategory") ?? "net_lease";
      const arrayBuffer = await req.arrayBuffer();
      if (!arrayBuffer.byteLength) {
        return NextResponse.json({ error: "No PDF file received." }, { status: 400 });
      }
      if (arrayBuffer.byteLength > 30 * 1024 * 1024) {
        return NextResponse.json(
          { error: `This PDF is ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB — too large (limit 30 MB). Try a compressed version or paste key pages as text.` },
          { status: 422 }
        );
      }
      pdfBuffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes("multipart/form-data")) {
      // FormData path (small files)
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

    const pdfBase64 = pdfBuffer.toString("base64");
    const result = await extractDealFromPdf(pdfBase64, dealCategory);
    return NextResponse.json(result);
  } catch (e) {
    console.error("intake/pdf error", e);
    return NextResponse.json({ error: humanizeAiError(e) }, { status: 500 });
  }
}
