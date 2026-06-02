/**
 * Converts Anthropic SDK / network errors into user-readable messages.
 */
export function humanizeAiError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("credit") || msg.includes("quota") || msg.includes("billing") || msg.includes("insufficient_quota"))
    return "Claude API credits exhausted. Add credits at console.anthropic.com, then try again.";
  if (msg.includes("API key") || msg.includes("authentication") || msg.includes("401"))
    return "Anthropic API key is invalid or missing. Check ANTHROPIC_API_KEY in settings.";
  if (msg.includes("rate_limit") || msg.includes("429"))
    return "Claude API rate limit hit. Wait a moment and try again.";
  if (msg.includes("overloaded") || msg.includes("529"))
    return "Claude API is overloaded. Try again in a few seconds.";
  return msg || "AI extraction failed.";
}
