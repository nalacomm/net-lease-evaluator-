"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { ASSET_TYPES } from "@/lib/constants";

type Mode = "add-button" | "add-form" | "delete-button";

export function BuyBoxManager({
  investorId,
  buyBoxId,
  mode,
}: {
  investorId: string;
  buyBoxId?: string;
  mode: Mode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [appliesTo, setAppliesTo] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);

  function toggleAsset(v: string) {
    setAppliesTo((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  async function handleDelete() {
    if (!buyBoxId) return;
    if (!confirm("Delete this buy box?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/investors/${investorId}/buyboxes/${buyBoxId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    if (!name.trim()) { setError("Name is required."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/investors/${investorId}/buyboxes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), appliesTo }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Create failed");
      setName("");
      setAppliesTo([]);
      setShowForm(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "delete-button") {
    return (
      <div>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          Delete
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (mode === "add-button") {
    return (
      <button
        onClick={() => setShowForm((v) => !v)}
        className="btn-primary text-sm"
      >
        <Plus className="h-4 w-4" /> Add Buy Box
      </button>
    );
  }

  // mode === "add-form"
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Add a Buy Box</h3>
      <p className="text-sm text-gray-500">
        Create a named buy box scoped to specific asset types. Leave asset types blank to make it the catch-all default. After creating it, edit the full criteria from the investor edit page.
      </p>
      <div>
        <label className="label">Name</label>
        <input
          type="text"
          className="input"
          placeholder="e.g. C-Store Box, QSR Box"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Applies to asset types (leave blank = all)</label>
        <div className="flex flex-wrap gap-2">
          {ASSET_TYPES.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => toggleAsset(a.value)}
              className={`rounded-full border px-3 py-1 text-sm ${
                appliesTo.includes(a.value)
                  ? "border-brand bg-brand text-white"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={handleAdd} disabled={busy} className="btn-primary">
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create Buy Box"}
      </button>
    </div>
  );
}
