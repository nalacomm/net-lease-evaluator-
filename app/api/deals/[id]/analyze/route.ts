import { NextResponse } from "next/server";
import { analyzeDeal } from "@/lib/analyze";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await analyzeDeal(params.id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Analyze failed" },
      { status: 500 }
    );
  }
}
