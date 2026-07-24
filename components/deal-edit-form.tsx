"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ASSET_TYPES,
  LEASE_TYPES,
  GUARANTY_TYPES,
  DEAL_STATUSES,
  DEAL_CATEGORIES,
  SOURCE_PLATFORMS,
  QUADRANTS,
} from "@/lib/constants";
import { Loader2 } from "lucide-react";

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  netLeaseOnly?: boolean;
};

const FIELDS: FieldDef[] = [
  { key: "address", label: "Address", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "state", label: "State", type: "text" },
  { key: "quadrant", label: "Quadrant", type: "select", options: QUADRANTS },
  { key: "assetType", label: "Asset Type", type: "select", options: ASSET_TYPES },
  { key: "tenantName", label: "Tenant / Occupant", type: "text" },
  { key: "operatorName", label: "Operator", type: "text", netLeaseOnly: true },
  { key: "operatorUnitCount", label: "Operator Units", type: "number", netLeaseOnly: true },
  { key: "guarantyType", label: "Guaranty", type: "select", options: GUARANTY_TYPES, netLeaseOnly: true },
  { key: "askingPrice", label: "Asking Price ($)", type: "number" },
  { key: "noi", label: "NOI ($/yr)", type: "number", netLeaseOnly: true },
  { key: "capRateAsking", label: "Cap Rate (%)", type: "number", netLeaseOnly: true },
  { key: "leaseType", label: "Lease Type", type: "select", options: LEASE_TYPES, netLeaseOnly: true },
  { key: "termRemainingYears", label: "Term Remaining (yrs)", type: "number", netLeaseOnly: true },
  { key: "bumpStructure", label: "Bump Structure", type: "text", netLeaseOnly: true },
  { key: "bumpPercent", label: "Bump % (annual)", type: "number", netLeaseOnly: true },
  { key: "constructionYear", label: "Construction Year", type: "number" },
  { key: "buildingSize", label: "Building SF", type: "number" },
  { key: "hhi3Mile", label: "HHI 3-Mile ($)", type: "number" },
  { key: "population1Mile", label: "Population 1-Mile", type: "number" },
  { key: "sourceBroker", label: "Source Broker", type: "text" },
  { key: "sourcePlatform", label: "Source Platform", type: "select", options: SOURCE_PLATFORMS },
  { key: "status", label: "Status", type: "select", options: DEAL_STATUSES },
];

export function DealEditForm({
  id,
  initial,
}: {
  id: string;
  initial: Record<string, unknown>;
}) {
  const router = useRouter();
  const [dealCategory, setDealCategory] = useState<string>(
    (initial.dealCategory as string) ?? "net_lease"
  );
  const [form, setForm] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = initial[f.key];
      o[f.key] = v == null ? "" : String(v);
    }
    return o;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dealCategory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.push(`/deals/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  const visibleFields = FIELDS.filter((f) => !f.netLeaseOnly || dealCategory === "net_lease");

  return (
    <div className="space-y-4">
      {/* Category toggle */}
      <div className="card">
        <label className="label mb-2 block">Deal Category</label>
        <div className="grid grid-cols-2 gap-2">
          {DEAL_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setDealCategory(c.value)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${
                dealCategory === c.value
                  ? "border-brand bg-brand text-white"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card grid gap-3 sm:grid-cols-2">
        {visibleFields.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            {f.type === "select" ? (
              <select
                className="input"
                value={form[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
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
                value={form[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary flex-1">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save Changes"}
        </button>
        <button onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}
