import { NextResponse } from "next/server";
import { extractDeal } from "@/lib/extract";
import { humanizeAiError } from "@/lib/ai-error";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { content } = await req.json();
    if (!content || typeof content !== "string" || content.trim().length < 10) {
      return NextResponse.json(
        { error: "Provide deal text (at least 10 characters)." },
        { status: 400 }
      );
    }
    const result = await extractDeal(content);
    return NextResponse.json(result);
  } catch (e) {
    console.error("intake/text error", e);
    return NextResponse.json({ error: humanizeAiError(e) }, { status: 500 });
  }
}
