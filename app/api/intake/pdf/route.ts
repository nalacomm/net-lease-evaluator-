import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { createClient } from "@supabase/supabase-js";
import { extractDealFromPdf } from "@/lib/extract";
import { humanizeAiError } from "@/lib/ai-error";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const contentType = req.headers.get("content-type") ?? "";

    let dealCategory = "net_lease";
    let pdfBuffer: Buffer;

    if (contentType.includes("application/json")) {
      const body = await req.json() as { blobUrl?: string; supabasePath?: string; dealCategory?: string };
      dealCategory = body.dealCategory ?? "net_lease";

      if (body.supabasePath) {
        // Large-file path: browser uploaded directly to Supabase Storage
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data, error } = await supabase.storage
          .from("temp-pdfs")
          .download(body.supabasePath);
        if (error || !data) {
          return NextResponse.json({ error: "Could not retrieve uploaded PDF." }, { status: 400 });
        }
        pdfBuffer = Buffer.from(await data.arrayBuffer());
        // Best-effort cleanup
        supabase.storage.from("temp-pdfs").remove([body.supabasePath]).catch(() => {});
      } else if (body.blobUrl) {
        // Legacy Vercel Blob path (kept for compatibility)
        const response = await fetch(body.blobUrl);
        if (!response.ok) {
          return NextResponse.json({ error: "Could not retrieve uploaded PDF." }, { status: 400 });
        }
        pdfBuffer = Buffer.from(await response.arrayBuffer());
        try { await del(body.blobUrl); } catch { /* best-effort */ }
      } else {
        return NextResponse.json({ error: "No PDF URL received." }, { status: 400 });
      }
    } else if (contentType.includes("application/pdf") || contentType.includes("application/octet-stream")) {
      // Small-file path: raw binary body
      dealCategory = url.searchParams.get("dealCategory") ?? "net_lease";
      const arrayBuffer = await req.arrayBuffer();
      if (!arrayBuffer.byteLength) {
        return NextResponse.json({ error: "No PDF file received." }, { status: 400 });
      }
      pdfBuffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes("multipart/form-data")) {
      // FormData fallback
      const form = await req.formData();
      dealCategory = (form.get("dealCategory") as string | null) ?? "net_lease";
      const file = form.get("file") as File | null;
      if (!file || file.size === 0) {
        return NextResponse.json({ error: "No PDF file received." }, { status: 400 });
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
