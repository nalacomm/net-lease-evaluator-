import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-4-6";

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
  // Try clean parse first
  try {
    return JSON.parse(text) as T;
  } catch {
    // Attempt to repair truncated JSON by closing any open strings/arrays/objects
    const repaired = repairJson(text);
    return JSON.parse(repaired) as T;
  }
}

function repairJson(text: string): string {
  // Remove trailing commas before closing braces/brackets
  let t = text.replace(/,\s*([}\]])/g, "$1");
  // Count open braces/brackets and close them
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (const ch of t) {
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  // If we're mid-string, close it
  if (inString) t += '"';
  // Close any open containers in reverse
  t += stack.reverse().join("");
  return t;
}
