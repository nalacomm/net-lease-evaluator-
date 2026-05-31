import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-4-20250514";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Call Claude and return plain text.
 */
export async function askText(
  prompt: string,
  opts: { system?: string; maxTokens?: number } = {}
): Promise<string> {
  const anthropic = getAnthropic();
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 1000,
    system: opts.system,
    messages: [{ role: "user", content: prompt }],
  });
  const block = res.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

/**
 * Call Claude expecting JSON. Strips markdown fences before parsing.
 */
export async function askJson<T = unknown>(
  prompt: string,
  opts: { system?: string; maxTokens?: number } = {}
): Promise<T> {
  const raw = await askText(prompt, opts);
  return parseJson<T>(raw);
}

export function parseJson<T = unknown>(raw: string): T {
  let text = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // Fall back to first {...} or [...] block
  if (!text.startsWith("{") && !text.startsWith("[")) {
    const obj = text.match(/[{[][\s\S]*[}\]]/);
    if (obj) text = obj[0];
  }
  return JSON.parse(text) as T;
}
