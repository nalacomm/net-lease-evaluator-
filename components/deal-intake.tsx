"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ASSET_TYPES,
  LEASE_TYPES,
  GUARANTY_TYPES,
  SOURCE_PLATFORMS,
  QUADRANTS,
} from "@/lib/constants";
import { Loader2, FileText, Link2, Type, AlertCircle } from "lucide-react";

type Investor = { id: string; name: string };
type Mode = "text" | "pdf" | "url";

const FIELDS: { key: string; label: string; type: "text" | "number" | "select"; options?: { value: string; label: string }[] }[] = [
  { key: "address", label: "Address", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "state", label: "State", type: "text" },
  { key: "quadrant", label: "Quadrant", type: "select", options: QUADRANTS },
  { key: "assetType", label: "Asset Type", type: "select", options: ASSET_TYPES },
  { key: "tenantName", label: "Tenant", type: "text" },
  { key: "operatorName", label: "Operator", type: "text" },
  { key: "operatorUnitCount", label: "Operator Units", type: "number" },
  { key: "guarantyType", label: "Guaranty", type: "select", options: GUARANTY_TYPES },
  { key: "askingPrice", label: "Asking Price ($)", type: "number" },
  { key: "noi", label: "NOI ($/yr)", type: "number" },
  { key: "capRateAsking", label: "Cap Rate (%)", type: "number" },
  { key: "leaseType", label: "Lease Type", type: "select", options: LEASE_TYPES },
  { key: "termRemainingYears", label: "Term Remaining (yrs)", type: "number" },
  { key: "bumpStructure", label: "Bump Structure", type: "text" },
  { key: "bumpPercent", label: "Bump % (annual)", type: "number" },
  { key: "constructionYear", label: "Construction Year", type: "number" },
  { key: "buildingSize", label: "Building SF", type: "number" },
  { key: "hhi3Mile", label: "HHI 3-Mile ($)", type: "number" },
  { key: "population1Mile", label: "Population 1-Mile", type: "number" },
  { key: "sourceBroker", label: "Source Broker", type: "text" },
  { key: "sourcePlatform", label: "Source Platform", type: "select", options: SOURCE_PLATFORMS },
];

export function DealIntake({ investors }: { investors: Investor[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [meta, setMeta] = useState<{
    inferredFields: string[];
    missingFields: string[];
    confidenceLevel: string;
    notes: string;
  } | null>(null);
  const [investorId, setInvestorId] = useState(investors[0]?.id ?? "");
  const [sourceType, setSourceType] = useState<Mode>("text");

  async function runExtract() {
    setError("");
    setExtracting(true);
    try {
      let res: Response;
      if (mode === "text") {
        res = await fetch("/api/intake/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        });
      } else if (mode === "url") {
        res = await fetch("/api/intake/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
      } else {
        const fd = new FormData();
        if (file) fd.append("file", file);
        res = await fetch("/api/intake/pdf", { method: "POST", body: fd });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      setDraft(data.deal);
      setMeta({
        inferredFields: data.inferredFields ?? [],
        missingFields: data.missingFields ?? [],
        confidenceLevel: data.confidenceLevel ?? "low",
        notes: data.notes ?? "",
      });
      setSourceType(mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  function update(key: string, value: string) {
    setDraft((d) => ({ ...(d ?? {}), [key]: value }));
  }

  async function save() {
    if (!investorId) {
      setError("Select an investor.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          investorId,
          sourceType,
          sourceUrl: mode === "url" ? url : null,
          confidenceLevel: meta?.confidenceLevel ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.push(`/deals/${data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  const missing = new Set(meta?.missingFields ?? []);
  const inferred = new Set(meta?.inferredFields ?? []);

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { m: "text", icon: Type, label: "Text" },
            { m: "pdf", icon: FileText, label: "PDF" },
            { m: "url", icon: Link2, label: "URL" },
          ] as const
        ).map(({ m, icon: Icon, label }) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex min-h-touch items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
              mode === m
                ? "border-brand bg-brand text-white"
                : "border-gray-300 bg-white text-gray-700"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="card">
        {mode === "text" && (
          <textarea
            className="input min-h-[200px]"
            placeholder="Paste OM summary, email blast, or broker notes…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )}
        {mode === "url" && (
          <input
            className="input"
            placeholder="https://www.crexi.com/properties/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        )}
        {mode === "pdf" && (
          <input
            type="file"
            accept="application/pdf"
            className="input"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        )}
        <button
          onClick={runExtract}
          disabled={extracting}
          className="btn-primary mt-3 w-full"
        >
          {extracting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Parsing…
            </>
          ) : (
            "Parse with AI"
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Draft review */}
      {draft && (
        <div className="space-y-4">
          {meta && (
            <div className="card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Confidence:</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    meta.confidenceLevel === "high"
                      ? "bg-green-100 text-green-800"
                      : meta.confidenceLevel === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {meta.confidenceLevel.toUpperCase()}
                </span>
              </div>
              {meta.notes && (
                <p className="mt-2 text-sm text-gray-600">{meta.notes}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                {meta.inferredFields.length} inferred ·{" "}
                {meta.missingFields.length} missing. Red = missing, amber =
                inferred. Review before saving.
              </p>
            </div>
          )}

          <div className="card">
            <label className="label">Investor *</label>
            <select
              className="input"
              value={investorId}
              onChange={(e) => setInvestorId(e.target.value)}
            >
              {investors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>

          <div className="card grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => {
              const val = draft[f.key];
              const isMissing = missing.has(f.key) && (val == null || val === "");
              const isInferred = inferred.has(f.key);
              return (
                <div key={f.key}>
                  <label className="label flex items-center gap-1">
                    {f.label}
                    {isMissing && (
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                    )}
                    {isInferred && !isMissing && (
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </label>
                  {f.type === "select" ? (
                    <select
                      className="input"
                      value={(val as string) ?? ""}
                      onChange={(e) => update(f.key, e.target.value)}
                    >
                      <option value="">—</option>
                      {f.options!.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="input"
                      type={f.type}
                      value={(val as string) ?? ""}
                      onChange={(e) => update(f.key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving & scoring…
              </>
            ) : (
              "Save & Score Deal"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
