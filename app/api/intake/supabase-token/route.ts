import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "temp-pdfs";

export async function POST(): Promise<Response> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create bucket on first use if it doesn't exist
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b) => b.name === BUCKET)) {
      await supabase.storage.createBucket(BUCKET, { public: false });
    }

    const path = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create upload URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ signedUrl: data.signedUrl, path: data.path });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
