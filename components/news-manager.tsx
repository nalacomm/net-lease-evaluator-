"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NEWS_CATEGORIES, labelFor } from "@/lib/constants";
import { Plus, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";

const IMPACT_COLORS: Record<string, string> = {
  positive: "bg-green-100 text-green-800 border-green-200",
  negative: "bg-red-100 text-red-800 border-red-200",
  neutral: "bg-gray-100 text-gray-700 border-gray-200",
  watch: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

type DealFlag = {
  id: string;
  relevance: string | null;
  impact: string | null;
  deal: { id: string; address: string | null; tenantName: string | null };
};

type NewsItem = {
  id: string;
  headline: string;
  summary: string | null;
  source: string | null;
  url: string | null;
  publishedAt: string | null;
  category: string | null;
  dealFlags: DealFlag[];
  createdAt: string;
};

export function NewsManager({ initialNews }: { initialNews: NewsItem[] }) {
  const router = useRouter();
  const [news, setNews] = useState(initialNews);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [form, setForm] = useState({
    headline: "",
    summary: "",
    source: "",
    url: "",
    publishedAt: "",
    category: "",
  });

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.headline.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setNews([data, ...news]);
      setForm({ headline: "", summary: "", source: "", url: "", publishedAt: "", category: "" });
      setShowForm(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <button
        onClick={() => setShowForm((s) => !s)}
        className="btn-primary"
      >
        <Plus className="h-4 w-4" /> Add News Item
      </button>

      {/* Form */}
      {showForm && (
        <form onSubmit={submit} className="card space-y-3">
          <div>
            <label className="label">Headline *</label>
            <input className="input" value={form.headline} onChange={(e) => update("headline", e.target.value)} required />
          </div>
          <div>
            <label className="label">Summary</label>
            <textarea className="input min-h-[80px]" value={form.summary} onChange={(e) => update("summary", e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Source</label>
              <input className="input" value={form.source} onChange={(e) => update("source", e.target.value)} />
            </div>
            <div>
              <label className="label">URL</label>
              <input className="input" type="url" value={form.url} onChange={(e) => update("url", e.target.value)} />
            </div>
            <div>
              <label className="label">Published Date</label>
              <input className="input" type="date" value={form.publishedAt} onChange={(e) => update("publishedAt", e.target.value)} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => update("category", e.target.value)}>
                <option value="">—</option>
                {NEWS_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving & tagging deals…</> : "Save & Tag Deals"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* News list */}
      {news.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No news items yet.</p>
      ) : (
        <ul className="space-y-2">
          {news.map((item) => (
            <li key={item.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.headline}</p>
                  <p className="text-xs text-gray-400">
                    {item.source}{item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleDateString()}` : ""}
                    {item.category ? ` · ${labelFor(NEWS_CATEGORIES, item.category)}` : ""}
                  </p>
                </div>
                {item.dealFlags.length > 0 && (
                  <button
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    className="flex min-h-touch items-center gap-1 rounded-lg bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800"
                  >
                    {item.dealFlags.length} deal{item.dealFlags.length > 1 ? "s" : ""} flagged
                    {expanded === item.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                )}
              </div>
              {item.summary && (
                <p className="mt-1 text-sm text-gray-600">{item.summary}</p>
              )}
              {expanded === item.id && item.dealFlags.length > 0 && (
                <ul className="mt-3 divide-y divide-gray-100">
                  {item.dealFlags.map((f) => (
                    <li key={f.id} className="py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link href={`/deals/${f.deal.id}`} className="text-sm font-medium text-brand hover:underline">
                          {f.deal.address ?? f.deal.tenantName ?? "Deal"}
                        </Link>
                        {f.impact && (
                          <span className={clsx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", IMPACT_COLORS[f.impact] ?? IMPACT_COLORS.neutral)}>
                            {f.impact}
                          </span>
                        )}
                      </div>
                      {f.relevance && <p className="text-xs text-gray-500">{f.relevance}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
