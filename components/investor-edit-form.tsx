"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ASSET_TYPES, LEASE_TYPES, GUARANTY_TYPES } from "@/lib/constants";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

// Stable helpers defined OUTSIDE component to avoid remount on every keystroke
function BbInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function BbSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

type InvestorWithBuyBox = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  entityName: string | null;
  notes: string | null;
  buyBox: {
    capRateMin: number;
    capRateTarget: number;
    priceMax: number;
    priceStretch: number | null;
    leaseTypePreferred: string;
    leaseTypeAcceptable: string;
    termMinYears: number;
    termPreferredYears: number | null;
    bumpMinPercent: number | null;
    bumpAltStructure: string | null;
    flatLeaseAllowed: boolean;
    guarantyPreferred: string;
    guarantyAcceptable: string;
    guarantyFloor: string;
    operatorMinUnits: number | null;
    dscrMin: number;
    ltv: number;
    interestRate: number;
    amortizationYears: number;
    constructionPreferred: string | null;
    hhiMin: number | null;
    assetTypesPreferred: string[];
    assetTypesAcceptable: string[];
    preferredStates: string[];
    targetMarkets: string[];
    acceptableZones: string[];
    currentMonthlyIncome: number | null;
    notes: string | null;
  } | null;
};

function n(v: number | null | undefined) {
  return v != null ? String(v) : "";
}

export function InvestorEditForm({ investor }: { investor: InvestorWithBuyBox }) {
  const router = useRouter();
  const bb = investor.buyBox;

  const [name, setName] = useState(investor.name);
  const [entityName, setEntityName] = useState(investor.entityName ?? "");
  const [email, setEmail] = useState(investor.email ?? "");
  const [phone, setPhone] = useState(investor.phone ?? "");
  const [notes, setNotes] = useState(investor.notes ?? "");

  const [form, setForm] = useState({
    capRateMin: n(bb?.capRateMin),
    capRateTarget: n(bb?.capRateTarget),
    priceMax: n(bb?.priceMax),
    priceStretch: n(bb?.priceStretch),
    leaseTypePreferred: bb?.leaseTypePreferred ?? "absolute_nnn",
    leaseTypeAcceptable: bb?.leaseTypeAcceptable ?? "nnn",
    termMinYears: n(bb?.termMinYears),
    termPreferredYears: n(bb?.termPreferredYears),
    bumpMinPercent: n(bb?.bumpMinPercent),
    bumpAltStructure: bb?.bumpAltStructure ?? "",
    flatLeaseAllowed: bb?.flatLeaseAllowed ?? false,
    guarantyPreferred: bb?.guarantyPreferred ?? "corporate",
    guarantyAcceptable: bb?.guarantyAcceptable ?? "multi_unit_franchisee",
    guarantyFloor: bb?.guarantyFloor ?? "single_personal",
    operatorMinUnits: n(bb?.operatorMinUnits),
    dscrMin: n(bb?.dscrMin) || "1.35",
    ltv: n(bb?.ltv) || "0.65",
    interestRate: n(bb?.interestRate) || "7.0",
    amortizationYears: n(bb?.amortizationYears) || "25",
    hhiMin: n(bb?.hhiMin),
    currentMonthlyIncome: n(bb?.currentMonthlyIncome) || "0",
  });

  const [preferred, setPreferred] = useState<string[]>(bb?.assetTypesPreferred ?? []);
  const [acceptable, setAcceptable] = useState<string[]>(bb?.assetTypesAcceptable ?? []);
  const [preferredStates, setPreferredStates] = useState((bb?.preferredStates ?? []).join(", "));
  const [targetMarkets, setTargetMarkets] = useState((bb?.targetMarkets ?? []).join(", "));
  const [acceptableZones, setAcceptableZones] = useState((bb?.acceptableZones ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftNarrative, setDraftNarrative] = useState("");
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [draftSummary, setDraftSummary] = useState<string | null>(null);

  function setF(k: string, v: string | boolean) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function toggle(list: string[], setList: (v: string[]) => void, v: string) {
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function applyDraft() {
    if (!draftNarrative.trim() && draftFiles.length === 0) {
      setDraftError("Add a description or upload a document first.");
      return;
    }
    setDraftError("");
    setDraftLoading(true);
    try {
      const fd = new FormData();
      fd.append("narrative", draftNarrative);
      for (const f of draftFiles) fd.append("files", f);
      const res = await fetch("/api/buybox/wizard", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Draft failed");
      const bb = data;
      setForm((prev) => ({
        ...prev,
        capRateMin: bb.capRateMin != null ? String(bb.capRateMin) : prev.capRateMin,
        capRateTarget: bb.capRateTarget != null ? String(bb.capRateTarget) : prev.capRateTarget,
        priceMax: bb.priceMax != null ? String(bb.priceMax) : prev.priceMax,
        priceStretch: bb.priceStretch != null ? String(bb.priceStretch) : prev.priceStretch,
        leaseTypePreferred: bb.leaseTypePreferred ?? prev.leaseTypePreferred,
        leaseTypeAcceptable: bb.leaseTypeAcceptable ?? prev.leaseTypeAcceptable,
        termMinYears: bb.termMinYears != null ? String(bb.termMinYears) : prev.termMinYears,
        termPreferredYears: bb.termPreferredYears != null ? String(bb.termPreferredYears) : prev.termPreferredYears,
        bumpMinPercent: bb.bumpMinPercent != null ? String(bb.bumpMinPercent) : prev.bumpMinPercent,
        bumpAltStructure: bb.bumpAltStructure ?? prev.bumpAltStructure,
        guarantyPreferred: bb.guarantyPreferred ?? prev.guarantyPreferred,
        guarantyAcceptable: bb.guarantyAcceptable ?? prev.guarantyAcceptable,
        guarantyFloor: bb.guarantyFloor ?? prev.guarantyFloor,
        operatorMinUnits: bb.operatorMinUnits != null ? String(bb.operatorMinUnits) : prev.operatorMinUnits,
        dscrMin: bb.dscrMin != null ? String(bb.dscrMin) : prev.dscrMin,
        ltv: bb.ltv != null ? String(bb.ltv) : prev.ltv,
        interestRate: bb.interestRate != null ? String(bb.interestRate) : prev.interestRate,
        amortizationYears: bb.amortizationYears != null ? String(bb.amortizationYears) : prev.amortizationYears,
        hhiMin: bb.hhiMin != null ? String(bb.hhiMin) : prev.hhiMin,
        currentMonthlyIncome: bb.currentMonthlyIncome != null ? String(bb.currentMonthlyIncome) : prev.currentMonthlyIncome,
      }));
      if (bb.assetTypesPreferred?.length) setPreferred(bb.assetTypesPreferred);
      if (bb.assetTypesAcceptable?.length) setAcceptable(bb.assetTypesAcceptable);
      if (bb.preferredStates?.length) setPreferredStates(bb.preferredStates.join(", "));
      if (bb.targetMarkets?.length) setTargetMarkets(bb.targetMarkets.join(", "));
      if (bb.acceptableZones?.length) setAcceptableZones(bb.acceptableZones.join(", "));
      if (bb.narrativeSummary && !notes.trim()) setNotes(bb.narrativeSummary);
      setDraftSummary(bb.narrativeSummary ?? null);
      setDraftOpen(false);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setDraftLoading(false);
    }
  }

  async function save() {
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError("");
    try {
      const statesArray = preferredStates.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      const marketsArray = targetMarkets.split(",").map((s) => s.trim()).filter(Boolean);
      const zonesArray = acceptableZones.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch(`/api/investors/${investor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, entityName, email, phone, notes,
          buyBox: {
            ...form,
            assetTypesPreferred: preferred,
            assetTypesAcceptable: acceptable,
            preferredStates: statesArray,
            targetMarkets: marketsArray,
            acceptableZones: zonesArray,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      router.push(`/investors/${investor.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 sm:grid-cols-2">
        <h3 className="col-span-full font-semibold">Investor Info</h3>
        <div>
          <label className="label">Full Name *</label>
          <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Entity / LLC</label>
          <input type="text" className="input" value={entityName} onChange={(e) => setEntityName(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="text" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input type="text" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="col-span-full">
          <label className="label">Notes / Investor Thesis</label>
          <textarea className="input min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <button
          type="button"
          onClick={() => setDraftOpen((o) => !o)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="font-semibold">Draft Buy Box with AI</span>
          {draftOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </button>
        {draftOpen && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-gray-500">Paste the investor&apos;s description, emails, or notes. Optionally attach PDFs. AI will draft the buy box fields below — review before saving.</p>
            <textarea
              className="input min-h-[120px]"
              placeholder="Describe what this investor is looking for — asset types, budget, location, lease preferences, hold period, etc."
              value={draftNarrative}
              onChange={(e) => setDraftNarrative(e.target.value)}
            />
            <div>
              <label className="label">Supporting documents (optional)</label>
              <input
                type="file"
                accept="application/pdf,.txt"
                multiple
                className="input"
                onChange={(e) => setDraftFiles(Array.from(e.target.files ?? []))}
              />
            </div>
            {draftError && <p className="text-sm text-red-600">{draftError}</p>}
            {draftSummary && (
              <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{draftSummary}</p>
            )}
            <button
              type="button"
              onClick={applyDraft}
              disabled={draftLoading}
              className="btn-primary w-full"
            >
              {draftLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Drafting…</> : "Generate & Apply"}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="mb-3 font-semibold">Buy Box</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <BbInput label="Cap Rate Floor (%)" value={form.capRateMin} onChange={(v) => setF("capRateMin", v)} />
          <BbInput label="Cap Rate Target (%)" value={form.capRateTarget} onChange={(v) => setF("capRateTarget", v)} />
          <BbInput label="Max Price ($)" value={form.priceMax} onChange={(v) => setF("priceMax", v)} />
          <BbInput label="Stretch Price ($)" value={form.priceStretch} onChange={(v) => setF("priceStretch", v)} />
          <BbSelect label="Preferred Lease" value={form.leaseTypePreferred} onChange={(v) => setF("leaseTypePreferred", v)} options={LEASE_TYPES} />
          <BbSelect label="Acceptable Lease" value={form.leaseTypeAcceptable} onChange={(v) => setF("leaseTypeAcceptable", v)} options={LEASE_TYPES} />
          <BbInput label="Min Term (yrs)" value={form.termMinYears} onChange={(v) => setF("termMinYears", v)} />
          <BbInput label="Preferred Term (yrs)" value={form.termPreferredYears} onChange={(v) => setF("termPreferredYears", v)} />
          <BbInput label="Min Bump (%)" value={form.bumpMinPercent} onChange={(v) => setF("bumpMinPercent", v)} />
          <div>
            <label className="label">Alt Bump Structure</label>
            <input type="text" className="input" value={form.bumpAltStructure} onChange={(e) => setF("bumpAltStructure", e.target.value)} />
          </div>
          <BbSelect label="Preferred Guaranty" value={form.guarantyPreferred} onChange={(v) => setF("guarantyPreferred", v)} options={GUARANTY_TYPES} />
          <BbSelect label="Guaranty Floor" value={form.guarantyFloor} onChange={(v) => setF("guarantyFloor", v)} options={GUARANTY_TYPES} />
          <BbInput label="Min Operator Units" value={form.operatorMinUnits} onChange={(v) => setF("operatorMinUnits", v)} />
          <BbInput label="Min DSCR" value={form.dscrMin} onChange={(v) => setF("dscrMin", v)} />
          <BbInput label="LTV (e.g. 0.65)" value={form.ltv} onChange={(v) => setF("ltv", v)} />
          <BbInput label="Interest Rate (%)" value={form.interestRate} onChange={(v) => setF("interestRate", v)} />
          <BbInput label="Amortization (yrs)" value={form.amortizationYears} onChange={(v) => setF("amortizationYears", v)} />
          <BbInput label="Min HHI ($)" value={form.hhiMin} onChange={(v) => setF("hhiMin", v)} />
        </div>

        <div className="mt-4">
          <label className="label">Preferred Asset Types</label>
          <div className="flex flex-wrap gap-2">
            {ASSET_TYPES.map((a) => (
              <button key={a.value} type="button" onClick={() => toggle(preferred, setPreferred, a.value)}
                className={`rounded-full border px-3 py-1.5 text-sm ${preferred.includes(a.value) ? "border-brand bg-brand text-white" : "border-gray-300 bg-white text-gray-700"}`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <label className="label">Acceptable Asset Types</label>
          <div className="flex flex-wrap gap-2">
            {ASSET_TYPES.map((a) => (
              <button key={a.value} type="button" onClick={() => toggle(acceptable, setAcceptable, a.value)}
                className={`rounded-full border px-3 py-1.5 text-sm ${acceptable.includes(a.value) ? "border-brand bg-brand text-white" : "border-gray-300 bg-white text-gray-700"}`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Preferred States (comma-separated)</label>
            <input
              type="text"
              className="input"
              value={preferredStates}
              onChange={(e) => setPreferredStates(e.target.value)}
              placeholder="DC, MD, VA"
            />
          </div>
          <div>
            <label className="label">Target Markets (comma-separated)</label>
            <input
              type="text"
              className="input"
              value={targetMarkets}
              onChange={(e) => setTargetMarkets(e.target.value)}
              placeholder="Washington, Baltimore, Bethesda"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="label">Acceptable Zoning (comma-separated)</label>
          <input
            type="text"
            className="input"
            value={acceptableZones}
            onChange={(e) => setAcceptableZones(e.target.value)}
            placeholder="C-1, C-2, B-3, Mixed Use"
          />
          <p className="mt-1 text-xs text-gray-400">Zones where this investor's deals would be acceptable. Used to flag zoning mismatches on deals.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save Changes"}
      </button>
    </div>
  );
}
