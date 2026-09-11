import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
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
      const body = await req.json() as {
        uploadId?: string;
        blobUrl?: string;
        dealCategory?: string;
      };
      dealCategory = body.dealCategory ?? "net_lease";

      if (body.uploadId) {
        // Chunked upload path: reassemble from DB
        const chunks = await prisma.$queryRawUnsafe<{ data: string }[]>(
          `SELECT "data" FROM "pdf_upload_chunks" WHERE "upload_id" = $1 ORDER BY "chunk_index" ASC`,
          body.uploadId
        );
        if (!chunks.length) {
          return NextResponse.json({ error: "Upload not found or expired. Please try again." }, { status: 400 });
        }
        const base64 = chunks.map((c) => c.data).join("");
        pdfBuffer = Buffer.from(base64, "base64");
        // Clean up — best effort
        prisma.$executeRawUnsafe(
          `DELETE FROM "pdf_upload_chunks" WHERE "upload_id" = $1`,
          body.uploadId
        ).catch(() => {});
      } else if (body.blobUrl) {
        // Legacy Vercel Blob path (kept for compatibility)
        const response = await fetch(body.blobUrl);
        if (!response.ok) {
          return NextResponse.json({ error: "Could not retrieve uploaded PDF." }, { status: 400 });
        }
        pdfBuffer = Buffer.from(await response.arrayBuffer());
        try { await del(body.blobUrl); } catch { /* best-effort */ }
      } else {
        return NextResponse.json({ error: "No PDF data received." }, { status: 400 });
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
