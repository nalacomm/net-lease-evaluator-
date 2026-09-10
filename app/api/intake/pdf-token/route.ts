import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["application/pdf"],
        maximumSizeInBytes: 30 * 1024 * 1024,
        addRandomSuffix: true,
        // Auto-expire blobs after 1 hour — they're temp files
      }),
      onUploadCompleted: async () => {
        // Nothing needed here — we process immediately after upload
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 }
    );
  }
}
