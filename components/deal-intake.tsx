"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ASSET_TYPES,
  LEASE_TYPES,
  GUARANTY_TYPES,
  SOURCE_PLATFORMS,
  QUADRANTS,
  DEAL_CATEGORIES,
} from "@/lib/constants";
import { Loader2, FileText, Link2, Type, AlertCircle } from "lucide-react";

type Investor = { id: string; name: string };
type Mode = "text" | "pdf" | "url";

// showFor: categories that show this field. undefined = show for all.
type FieldDef = { key: string; label: string; type: "text" | "number" | "select"; options?: { value: string; label: string }[]; showFor?: string[] };

const FIELDS: FieldDef[] = [
  { key: "address", label: "Address", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "state", label: "State", type: "text" },
  { key: "quadrant", label: "Quadrant", type: "select", options: QUADRANTS },
  { key: "assetType", label: "Asset Type", type: "select", options: ASSET_TYPES },
  { key: "tenantName", label: "Tenant / Anchor", type: "text" },
  { key: "operatorName", label: "Operator", type: "text", showFor: ["net_lease"] },
  { key: "operatorUnitCount", label: "Operator Units", type: "number", showFor: ["net_lease"] },
  { key: "guarantyType", label: "Guaranty", type: "select", options: GUARANTY_TYPES, showFor: ["net_lease"] },
  { key: "askingPrice", label: "Asking Price ($)", type: "number" },
  { key: "noi", label: "NOI ($/yr)", type: "number", showFor: ["net_lease", "multi_tenant", "retail_plaza"] },
  { key: "capRateAsking", label: "Cap Rate (%)", type: "number", showFor: ["net_lease", "multi_tenant", "retail_plaza"] },
  { key: "leaseType", label: "Lease Type", type: "select", options: LEASE_TYPES, showFor: ["net_lease"] },
  { key: "termRemainingYears", label: "Term Remaining (yrs)", type: "number", showFor: ["net_lease"] },
  { key: "bumpStructure", label: "Bump Structure", type: "text", showFor: ["net_lease"] },
  { key: "bumpPercent", label: "Bump % (annual)", type: "number", showFor: ["net_lease"] },
  { key: "grossLeasableArea", label: "GLA (SF)", type: "number", showFor: ["multi_tenant", "retail_plaza"] },
  { key: "vacancyRate", label: "Vacancy Rate (%)", type: "number", showFor: ["multi_tenant", "retail_plaza"] },
  { key: "numberOfTenants", label: "Number of Tenants", type: "number", showFor: ["multi_tenant", "retail_plaza"] },
  { key: "anchorTenant", label: "Anchor Tenant", type: "text", showFor: ["retail_plaza", "multi_tenant"] },
  { key: "zoning", label: "Zoning", type: "text", showFor: ["multi_tenant", "retail_plaza", "land", "other_cre"] },
  { key: "entitlements", label: "Entitlement Status", type: "select", options: [
    { value: "raw", label: "Raw / Unentitled" },
    { value: "partially_entitled", label: "Partially Entitled" },
    { value: "fully_entitled", label: "Fully Entitled" },
    { value: "permitted", label: "Permitted / Ready to Build" },
  ], showFor: ["land"] },
  { key: "lotSize", label: "Lot Size / Acreage", type: "number", showFor: ["land"] },
  { key: "constructionYear", label: "Construction Year", type: "number", showFor: ["net_lease", "multi_tenant", "retail_plaza", "other_cre"] },
  { key: "buildingSize", label: "Building SF", type: "number", showFor: ["net_lease", "multi_tenant", "retail_plaza", "other_cre"] },
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
  const [dealCategory, setDealCategory] = useState("net_lease");

  async function runExtract() {
    setError("");
    setExtracting(true);
    try {
      let res: Response;
      if (mode === "text") {
        res = await fetch("/api/intake/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text, dealCategory }),
        });
      } else if (mode === "url") {
        res = await fetch("/api/intake/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, dealCategory }),
        });
      } else {
        if (!file) throw new Error("No file selected.");
        // Use FileReader.readAsDataURL — the browser-native, cross-platform way
        // to encode a file as base64. btoa() throws on certain binary content in Safari.
        let pdfBase64: string;
        try {
          pdfBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              // dataUrl = "data:application/pdf;base64,XXXX..."
              const b64 = dataUrl.split(",")[1];
              if (!b64) reject(new Error("FileReader: no base64 data in data URL"));
              else resolve(b64);
            };
            reader.onerror = () => reject(new Error("FileReader: could not read file"));
            reader.readAsDataURL(file);
          });
        } catch (e) {
          throw new Error("PDF read error: " + (e instanceof Error ? e.message : String(e)));
        }
        let fetchRes: Response;
        try {
          fetchRes = await fetch("/api/intake/pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdfBase64, dealCategory }),
          });
        } catch (e) {
          throw new Error("Network error: " + (e instanceof Error ? e.message : String(e)));
        }
        let fetchData: { error?: string; deal?: unknown; inferredFields?: string[]; missingFields?: string[]; confidenceLevel?: string; notes?: string };
        try {
          fetchData = await fetchRes.json();
        } catch (e) {
          throw new Error("Server returned non-JSON (status " + fetchRes.status + "): " + (e instanceof Error ? e.message : String(e)));
        }
        if (!fetchRes.ok) throw new Error(fetchData.error ?? "Extraction failed");
        setDraft(fetchData.deal as Record<string, unknown>);
        setMeta({
          inferredFields: fetchData.inferredFields ?? [],
          missingFields: fetchData.missingFields ?? [],
          confidenceLevel: fetchData.confidenceLevel ?? "low",
          notes: fetchData.notes ?? "",
        });
        setSourceType(mode);
        setExtracting(false);
        return;
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
          dealCategory,
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
  const visibleFields = FIELDS.filter((f) => !f.showFor || f.showFor.includes(dealCategory));
  const visibleKeys = new Set(visibleFields.map((f) => f.key));
  const effectiveMissing = (meta?.missingFields ?? []).filter((k) => visibleKeys.has(k));
  const effectiveInferred = (meta?.inferredFields ?? []).filter((k) => visibleKeys.has(k));

  return (
    <div className="space-y-5">
      {/* Deal category */}
      <div className="grid grid-cols-2 gap-2">
        {DEAL_CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setDealCategory(c.value)}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${
              dealCategory === c.value
                ? "border-brand bg-brand text-white"
                : "border-gray-300 bg-white text-gray-700"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

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
                {effectiveInferred.length} inferred ·{" "}
                {effectiveMissing.length} missing. Red = missing, amber =
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
            {visibleFields.map((f) => {
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

          {/* Multi-tenant / retail plaza: WALT summary + rent roll preview */}
          {(dealCategory === "multi_tenant" || dealCategory === "retail_plaza") && draft && (() => {
            const rentRoll = (draft.rentRoll as { tenantName: string; squareFeet?: number | null; annualRent: number | null; remainingYears: number | null; leaseType?: string | null }[] | null) ?? [];
            const walt = (draft.walt as number | null);
            if (!walt && rentRoll.length === 0) return null;
            return (
              <div className="card space-y-3">
                {walt != null && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 shrink-0">
                      <span className="text-sm font-bold text-brand">{walt.toFixed(1)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">WALT — {walt.toFixed(1)} yrs</p>
                      <p className="text-xs text-gray-500">
                        {walt >= 7 ? "Strong income durability" : walt >= 5 ? "Moderate — watch near-term expirations" : "Short — elevated rollover risk"}
                      </p>
                    </div>
                  </div>
                )}
                {rentRoll.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Rent Roll ({rentRoll.length} tenants)</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 text-left text-gray-400">
                            <th className="pb-1 pr-3 font-medium">Tenant</th>
                            <th className="pb-1 pr-3 font-medium text-right">SF</th>
                            <th className="pb-1 pr-3 font-medium text-right">Annual Rent</th>
                            <th className="pb-1 font-medium text-right">Yrs Left</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {rentRoll.map((r, i) => (
                            <tr key={i}>
                              <td className="py-1 pr-3 font-medium text-gray-800">{r.tenantName}</td>
                              <td className="py-1 pr-3 text-right text-gray-500">{r.squareFeet != null ? r.squareFeet.toLocaleString() : "—"}</td>
                              <td className="py-1 pr-3 text-right text-gray-500">{r.annualRent != null ? `$${(r.annualRent / 1000).toFixed(0)}K` : "—"}</td>
                              <td className="py-1 text-right text-gray-500">{r.remainingYears != null ? r.remainingYears.toFixed(1) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

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
