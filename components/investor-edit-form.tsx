"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ASSET_TYPES, LEASE_TYPES, GUARANTY_TYPES } from "@/lib/constants";
import { Loader2 } from "lucide-react";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setF(k: string, v: string | boolean) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function toggle(list: string[], setList: (v: string[]) => void, v: string) {
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function save() {
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/investors/${investor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, entityName, email, phone, notes,
          buyBox: { ...form, assetTypesPreferred: preferred, assetTypesAcceptable: acceptable },
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
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save Changes"}
      </button>
    </div>
  );
}
