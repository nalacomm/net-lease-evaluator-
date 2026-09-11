import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

const ENSURE_TABLE = `
  CREATE TABLE IF NOT EXISTS "pdf_upload_chunks" (
    "upload_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "total_chunks" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY ("upload_id", "chunk_index")
  )
`;

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      uploadId: string;
      chunkIndex: number;
      totalChunks: number;
      data: string;
    };
    const { uploadId, chunkIndex, totalChunks, data } = body;
    if (!uploadId || typeof chunkIndex !== "number" || !data) {
      return NextResponse.json({ error: "Invalid chunk payload." }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(ENSURE_TABLE);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "pdf_upload_chunks" ("upload_id", "chunk_index", "total_chunks", "data")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("upload_id", "chunk_index") DO UPDATE SET "data" = $4`,
      uploadId, chunkIndex, totalChunks, data
    );

    // Expire chunks older than 1 hour (best-effort)
    prisma.$executeRawUnsafe(
      `DELETE FROM "pdf_upload_chunks" WHERE "created_at" < NOW() - INTERVAL '1 hour'`
    ).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
