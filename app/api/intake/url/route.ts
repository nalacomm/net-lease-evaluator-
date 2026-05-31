import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { extractDeal } from "@/lib/extract";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Provide a URL." }, { status: 400 });
    }
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Fetch failed (${res.status}). Site may block scraping — paste text instead.` },
        { status: 422 }
      );
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, noscript, svg, header, footer, nav").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();
    if (text.length < 50) {
      return NextResponse.json(
        { error: "Page had no readable content. Paste text instead." },
        { status: 422 }
      );
    }
    const result = await extractDeal(text);
    return NextResponse.json(result);
  } catch (e) {
    console.error("intake/url error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "URL parse failed" },
      { status: 500 }
    );
  }
}
