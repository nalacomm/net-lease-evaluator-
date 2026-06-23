"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NEWS_CATEGORIES, labelFor } from "@/lib/constants";
import {
  Plus, Loader2, AlertCircle, ChevronDown, ChevronUp,
  FileUp, Sparkles, X, Building2, Store, MapPin, TrendingUp,
} from "lucide-react";
import clsx from "clsx";
import type { PdfAnalysisResult, PdfInsight } from "@/app/api/news/analyze-pdf/route";

// ── Constants ──────────────────────────────────────────────────────────────

const IMPACT_COLORS: Record<string, string> = {
  positive: "bg-green-100 text-green-800 border-green-200",
  negative: "bg-red-100 text-red-800 border-red-200",
  neutral: "bg-gray-100 text-gray-700 border-gray-200",
  watch: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const INSIGHT_TYPE_LABEL: Record<string, string> = {
  cap_rate: "Cap Rate",
  tenant_expansion: "Tenant Expansion",
  market_data: "Market Data",
  demographics: "Demographics",
  interest_rates: "Interest Rates",
  regulatory: "Regulatory",
  credit_rating: "Credit Rating",
  other: "Insight",
};

const INSIGHT_TYPE_COLOR: Record<string, string> = {
  cap_rate: "bg-blue-50 border-blue-200 text-blue-800",
  tenant_expansion: "bg-teal-50 border-teal-200 text-teal-800",
  market_data: "bg-purple-50 border-purple-200 text-purple-800",
  demographics: "bg-orange-50 border-orange-200 text-orange-800",
  interest_rates: "bg-red-50 border-red-200 text-red-700",
  regulatory: "bg-yellow-50 border-yellow-200 text-yellow-800",
  credit_rating: "bg-rose-50 border-rose-200 text-rose-800",
  other: "bg-gray-50 border-gray-200 text-gray-700",
};

const RELEVANT_TO_ICON: Record<string, React.ReactNode> = {
  investors: <Building2 className="h-3 w-3" />,
  tenants: <Store className="h-3 w-3" />,
  sites: <MapPin className="h-3 w-3" />,
  deals: <TrendingUp className="h-3 w-3" />,
};

// ── Types ──────────────────────────────────────────────────────────────────

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

// ── InsightCard ────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: PdfInsight }) {
  const colorClass = INSIGHT_TYPE_COLOR[insight.type] ?? INSIGHT_TYPE_COLOR.other;
  const typeLabel = INSIGHT_TYPE_LABEL[insight.type] ?? "Insight";

  return (
    <div className={clsx("rounded-lg border p-3 space-y-1.5", colorClass)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide opacity-70">{typeLabel}</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {insight.relevantTo.map((r) => (
            <span key={r} className="flex items-center gap-0.5 rounded-full bg-white/60 px-1.5 py-0.5 text-xs font-medium capitalize">
              {RELEVANT_TO_ICON[r]} {r}
            </span>
          ))}
        </div>
      </div>
      <p className="font-semibold text-sm">{insight.title}</p>
      <p className="text-sm opacity-90">{insight.detail}</p>
      {insight.dataPoints && (
        <p className="text-xs font-mono opacity-70 bg-white/40 rounded px-2 py-1">{insight.dataPoints}</p>
      )}
      {/* Contextual action links */}
      <div className="flex flex-wrap gap-2 pt-1">
        {insight.relevantTo.includes("investors") && (
          <Link href="/investors" className="text-xs underline underline-offset-2 hover:opacity-70">
            Review investor criteria →
          </Link>
        )}
        {insight.relevantTo.includes("tenants") && (
          <Link href="/tenants" className="text-xs underline underline-offset-2 hover:opacity-70">
            Review tenant requirements →
          </Link>
        )}
        {insight.relevantTo.includes("sites") && (
          <Link href="/sites" className="text-xs underline underline-offset-2 hover:opacity-70">
            Review active sites →
          </Link>
        )}
        {insight.relevantTo.includes("deals") && (
          <Link href="/deals" className="text-xs underline underline-offset-2 hover:opacity-70">
            Review active deals →
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function NewsManager({ initialNews }: { initialNews: NewsItem[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [news, setNews] = useState(initialNews);
  const [mode, setMode] = useState<"manual" | "pdf">("manual");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [insights, setInsights] = useState<PdfInsight[]>([]);
  const [dragging, setDragging] = useState(false);

  const [form, setForm] = useState({
    headline: "",
    summary: "",
    source: "",
    url: "",
    publishedAt: "",
    category: "",
    rawContent: "",
  });

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function resetForm() {
    setForm({ headline: "", summary: "", source: "", url: "", publishedAt: "", category: "", rawContent: "" });
    setInsights([]);
    setPdfFile(null);
  }

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }
    setPdfFile(file);
    setError("");
  }

  async function analyzePdf() {
    if (!pdfFile) return;
    setAnalyzing(true);
    setError("");
    setInsights([]);
    try {
      const fd = new FormData();
      fd.append("file", pdfFile);
      const res = await fetch("/api/news/analyze-pdf", { method: "POST", body: fd });
      const data: PdfAnalysisResult = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error: string }).error ?? "Failed");

      // Only use publishedAt if it's a valid YYYY-MM-DD string — the browser date input is strict
      const rawDate = data.publishedAt ?? "";
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : "";

      setForm({
        headline: data.headline ?? "",
        summary: data.summary ?? "",
        source: data.source ?? "",
        url: "",
        publishedAt: validDate,
        category: data.category ?? "",
        rawContent: data.rawContent ?? "",
      });
      setInsights(data.insights ?? []);
      setShowForm(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze PDF");
    } finally {
      setAnalyzing(false);
    }
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
      resetForm();
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
      {/* Mode toggle + add button */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => { setMode("manual"); resetForm(); setShowForm(false); setError(""); }}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "manual" ? "bg-white shadow text-brand" : "text-gray-600 hover:text-gray-900"
            )}
          >
            Manual Entry
          </button>
          <button
            onClick={() => { setMode("pdf"); resetForm(); setShowForm(false); setError(""); }}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "pdf" ? "bg-white shadow text-brand" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <FileUp className="h-3.5 w-3.5" /> Upload PDF
          </button>
        </div>

        {mode === "manual" && (
          <button onClick={() => setShowForm((s) => !s)} className="btn-primary">
            <Plus className="h-4 w-4" /> Add News Item
          </button>
        )}
      </div>

      {/* ── PDF MODE ── */}
      {mode === "pdf" && (
        <div className="space-y-4">
          {/* Drop zone */}
          {!showForm && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              onClick={() => fileRef.current?.click()}
              className={clsx(
                "flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors",
                dragging ? "border-brand bg-brand/5" : "border-gray-300 bg-gray-50 hover:border-brand hover:bg-brand/5"
              )}
            >
              <FileUp className={clsx("h-8 w-8", dragging ? "text-brand" : "text-gray-400")} />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Drop a PDF here or click to browse</p>
                <p className="text-xs text-gray-400 mt-0.5">Market reports, research, news — up to 10 MB</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          )}

          {/* Selected file + analyze */}
          {pdfFile && !showForm && (
            <div className="card flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileUp className="h-5 w-5 shrink-0 text-brand" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{pdfFile.name}</p>
                  <p className="text-xs text-gray-400">{(pdfFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { setPdfFile(null); setError(""); }}
                  className="btn-secondary p-2"
                >
                  <X className="h-4 w-4" />
                </button>
                <button onClick={analyzePdf} disabled={analyzing} className="btn-primary">
                  {analyzing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Analyze with AI</>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && !showForm && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* Insights panel — shown after analysis, before form submission */}
          {insights.length > 0 && showForm && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand" />
                <h2 className="font-semibold text-gray-900">AI Insights ({insights.length})</h2>
                <p className="text-xs text-gray-500">Extracted from the PDF — review these to update investor or tenant criteria</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {insights.map((ins, i) => (
                  <InsightCard key={i} insight={ins} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FORM (manual or post-PDF analysis) ── */}
      {showForm && (
        <form onSubmit={submit} className="card space-y-3">
          {mode === "pdf" && pdfFile && (
            <div className="flex items-center gap-2 rounded-lg bg-brand/5 px-3 py-2 text-xs text-brand">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              Pre-filled from <span className="font-medium">{pdfFile.name}</span> — review and edit before saving.
            </div>
          )}
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
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving & tagging…</>
              ) : (
                "Save & Tag Deals / Sites"
              )}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── NEWS LIST ── */}
      {news.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No news items yet.</p>
      ) : (
        <ul className="space-y-2">
          {news.map((item) => (
            <li key={item.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
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
                          <span className={clsx(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                            IMPACT_COLORS[f.impact] ?? IMPACT_COLORS.neutral
                          )}>
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
