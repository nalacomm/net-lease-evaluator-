"use client";

import { useState } from "react";
import { Loader2, Lightbulb, RefreshCw } from "lucide-react";

export function InvestorAnalysis({
  investorId,
  initialSummary,
}: {
  investorId: string;
  initialSummary: string | null;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/investors/${investorId}/analyze`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setSummary(data.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-brand" />
          <h2 className="font-semibold">Investor Profile Summary</h2>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="btn-secondary text-xs"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : summary ? (
            <RefreshCw className="h-3 w-3" />
          ) : (
            <Lightbulb className="h-3 w-3" />
          )}
          {summary ? "Re-generate" : "Generate Summary"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {summary ? (
        <p className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{summary}</p>
      ) : (
        <p className="mt-3 text-sm text-gray-400">
          Generate an AI summary of this investor&apos;s strategy, buy box, and pipeline.
        </p>
      )}
    </div>
  );
}
