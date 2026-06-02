"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ASSET_TYPES, LEASE_TYPES, GUARANTY_TYPES } from "@/lib/constants";
import { Loader2, Sparkles, ClipboardList, AlertCircle, Upload, X } from "lucide-react";

type BuyBoxDraft = {
  capRateMin: number | null;
  capRateTarget: number | null;
  priceMax: number | null;
  priceStretch: number | null;
  leaseTypePreferred: string;
  leaseTypeAcceptable: string;
  termMinYears: number | null;
  termPreferredYears: number | null;
  bumpMinPercent: number | null;
  bumpAltStructure: string | null;
  flatLeaseAllowed: boolean;
  guarantyPreferred: string;
  guarantyAcceptable: string;
  guarantyFloor: string;
  operatorMinUnits: number | null;
  dscrMin: number | null;
  ltv: number | null;
  interestRate: number | null;
  amortizationYears: number | null;
  hhiMin: number | null;
  assetTypesPreferred: string[];
  assetTypesAcceptable: string[];
  currentMonthlyIncome: number | null;
  notes: string | null;
  inferredFields: string[];
  missingFields: string[];
  confidenceLevel: string;
  narrativeSummary: string;
};

type Mode = "choose" | "manual" | "ai";

function n(v: number | null | undefined) {
  return v != null ? String(v) : "";
}

export function InvestorOnboarding() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");

  // AI wizard state
  const [narrative, setNarrative] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [wizarding, setWizarding] = useState(false);
  const [wizardResult, setWizardResult] = useState<BuyBoxDraft | null>(null);
  const [wizardError, setWizardError] = useState("");

  // Shared form state (populated by manual or AI)
  const [name, setName] = useState("");
  const [entityName, setEntityName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [bb, setBb] = useState({
    capRateMin: "",
    capRateTarget: "",
    priceMax: "",
    priceStretch: "",
    leaseTypePreferred: "absolute_nnn",
    leaseTypeAcceptable: "nnn",
    termMinYears: "",
    termPreferredYears: "",
    bumpMinPercent: "",
    bumpAltStructure: "",
    flatLeaseAllowed: false,
    guarantyPreferred: "corporate",
    guarantyAcceptable: "multi_unit_franchisee",
    guarantyFloor: "single_personal",
    operatorMinUnits: "",
    dscrMin: "1.35",
    ltv: "0.65",
    interestRate: "7.0",
    amortizationYears: "25",
    hhiMin: "",
    currentMonthlyIncome: "0",
  });
  const [preferred, setPreferred] = useState<string[]>([]);
  const [acceptable, setAcceptable] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function setBbField(k: string, v: string | boolean) {
    setBb((b) => ({ ...b, [k]: v }));
  }

  function toggle(list: string[], setList: (v: string[]) => void, v: string) {
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  // Populate form from AI wizard result
  function applyWizard(d: BuyBoxDraft) {
    setBb({
      capRateMin: n(d.capRateMin),
      capRateTarget: n(d.capRateTarget),
      priceMax: n(d.priceMax),
      priceStretch: n(d.priceStretch),
      leaseTypePreferred: d.leaseTypePreferred ?? "absolute_nnn",
      leaseTypeAcceptable: d.leaseTypeAcceptable ?? "nnn",
      termMinYears: n(d.termMinYears),
      termPreferredYears: n(d.termPreferredYears),
      bumpMinPercent: n(d.bumpMinPercent),
      bumpAltStructure: d.bumpAltStructure ?? "",
      flatLeaseAllowed: d.flatLeaseAllowed ?? false,
      guarantyPreferred: d.guarantyPreferred ?? "corporate",
      guarantyAcceptable: d.guarantyAcceptable ?? "multi_unit_franchisee",
      guarantyFloor: d.guarantyFloor ?? "single_personal",
      operatorMinUnits: n(d.operatorMinUnits),
      dscrMin: n(d.dscrMin) || "1.35",
      ltv: n(d.ltv) || "0.65",
      interestRate: n(d.interestRate) || "7.0",
      amortizationYears: n(d.amortizationYears) || "25",
      hhiMin: n(d.hhiMin),
      currentMonthlyIncome: n(d.currentMonthlyIncome) || "0",
    });
    setPreferred(d.assetTypesPreferred ?? []);
    setAcceptable(d.assetTypesAcceptable ?? []);
    if (d.notes) setNotes(d.notes);
    setWizardResult(d);
    setMode("manual"); // Switch to review form
  }

  async function runWizard() {
    setWizarding(true);
    setWizardError("");
    try {
      const fd = new FormData();
      fd.append("narrative", narrative);
      files.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/buybox/wizard", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      applyWizard(data);
    } catch (e) {
      setWizardError(e instanceof Error ? e.message : "Failed");
    } finally {
      setWizarding(false);
    }
  }

  async function save() {
    if (!name.trim()) { setSaveError("Name is required."); return; }
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, entityName, email, phone, notes,
          buyBox: { ...bb, assetTypesPreferred: preferred, assetTypesAcceptable: acceptable },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      router.push(`/investors/${data.id}`);
      router.refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed");
      setSaving(false);
    }
  }

  // ---- CHOOSE MODE ----
  if (mode === "choose") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => setMode("manual")}
          className="card flex flex-col items-start gap-3 text-left hover:border-brand"
        >
          <ClipboardList className="h-8 w-8 text-brand" />
          <div>
            <p className="font-semibold text-gray-900">Manual entry</p>
            <p className="text-sm text-gray-500">You know the buy box numbers. Fill in the form directly.</p>
          </div>
        </button>
        <button
          onClick={() => setMode("ai")}
          className="card flex flex-col items-start gap-3 text-left hover:border-brand"
        >
          <Sparkles className="h-8 w-8 text-brand" />
          <div>
            <p className="font-semibold text-gray-900">AI Buy Box Wizard</p>
            <p className="text-sm text-gray-500">Describe what the investor wants, upload bank approvals or deal flyers — AI builds the buy box draft for you to review.</p>
          </div>
        </button>
      </div>
    );
  }

  // ---- AI WIZARD INPUT ----
  if (mode === "ai") {
    return (
      <div className="space-y-4">
        <button onClick={() => setMode("choose")} className="btn-secondary text-sm">← Back</button>
        <div className="card space-y-4">
          <div>
            <label className="label">Describe the investor and what they're looking for</label>
            <textarea
              className="input min-h-[140px]"
              placeholder="e.g. This is Chris. He wants shopping centers, looking to spend up to $2M. He has a bank approval for $2M. Wants stable tenants, prefers NNN leases, open to multi-tenant. Doesn't need bumps but would like some. Has no existing portfolio."
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Upload supporting docs (optional)</label>
            <p className="mb-2 text-xs text-gray-500">Bank approval letters, deal flyers, OMs — anything that shows what they like or what they can afford.</p>
            <input
              type="file"
              multiple
              accept=".pdf,.txt"
              className="input"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <Upload className="h-3 w-3" /> {f.name}
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="ml-auto">
                      <X className="h-3 w-3 text-gray-400" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {wizardError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" /> {wizardError}
            </div>
          )}
          <button
            onClick={runWizard}
            disabled={wizarding || (!narrative.trim() && files.length === 0)}
            className="btn-primary w-full"
          >
            {wizarding ? <><Loader2 className="h-4 w-4 animate-spin" /> Building buy box…</> : <><Sparkles className="h-4 w-4" /> Build Buy Box with AI</>}
          </button>
        </div>
      </div>
    );
  }

  // ---- REVIEW / MANUAL FORM ----
  const inferred = new Set(wizardResult?.inferredFields ?? []);
  const missing = new Set(wizardResult?.missingFields ?? []);

  const F = ({ k, label }: { k: string; label: string }) => {
    const val = (bb as Record<string, unknown>)[k] as string;
    const isInferred = inferred.has(k);
    const isMissing = missing.has(k) && !val;
    return (
      <div>
        <label className="label flex items-center gap-1.5">
          {label}
          {isMissing && <span className="h-2 w-2 rounded-full bg-red-500" title="Missing" />}
          {isInferred && !isMissing && <span className="h-2 w-2 rounded-full bg-amber-400" title="AI-inferred" />}
        </label>
        <input
          type="text"
          inputMode="decimal"
          className="input"
          value={val ?? ""}
          onChange={(e) => setBbField(k, e.target.value)}
        />
      </div>
    );
  };

  const S = ({ k, label, options }: { k: string; label: string; options: { value: string; label: string }[] }) => (
    <div>
      <label className="label">{label}</label>
      <select
        className="input"
        value={(bb as Record<string, unknown>)[k] as string}
        onChange={(e) => setBbField(k, e.target.value)}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-4">
      <button onClick={() => setMode("choose")} className="btn-secondary text-sm">← Back</button>

      {wizardResult && (
        <div className="card">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <span className="font-medium text-gray-900">AI-generated buy box — review before saving</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              wizardResult.confidenceLevel === "high" ? "bg-green-100 text-green-800" :
              wizardResult.confidenceLevel === "medium" ? "bg-yellow-100 text-yellow-800" :
              "bg-red-100 text-red-800"
            }`}>{wizardResult.confidenceLevel.toUpperCase()} confidence</span>
          </div>
          {wizardResult.narrativeSummary && (
            <p className="mt-2 text-sm text-gray-600">{wizardResult.narrativeSummary}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            Amber dots = AI-inferred. Red dots = missing. Edit any field before saving.
          </p>
        </div>
      )}

      {/* Investor info */}
      <div className="card grid gap-3 sm:grid-cols-2">
        <h3 className="col-span-full font-semibold">Investor Info</h3>
        {[
          { k: "name", label: "Full Name *", val: name, set: setName },
          { k: "entityName", label: "Entity / LLC", val: entityName, set: setEntityName },
          { k: "email", label: "Email", val: email, set: setEmail },
          { k: "phone", label: "Phone", val: phone, set: setPhone },
        ].map(({ k, label, val, set }) => (
          <div key={k}>
            <label className="label">{label}</label>
            <input type="text" className="input" value={val} onChange={(e) => set(e.target.value)} />
          </div>
        ))}
        <div className="col-span-full">
          <label className="label">Notes</label>
          <textarea className="input min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Buy box */}
      <div className="card">
        <h3 className="mb-3 font-semibold">Buy Box</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <F k="capRateMin" label="Cap Rate Floor (%)" />
          <F k="capRateTarget" label="Cap Rate Target (%)" />
          <F k="priceMax" label="Max Price ($)" />
          <F k="priceStretch" label="Stretch Price ($)" />
          <S k="leaseTypePreferred" label="Preferred Lease" options={LEASE_TYPES} />
          <S k="leaseTypeAcceptable" label="Acceptable Lease" options={LEASE_TYPES} />
          <F k="termMinYears" label="Min Term (yrs)" />
          <F k="termPreferredYears" label="Preferred Term (yrs)" />
          <F k="bumpMinPercent" label="Min Bump (%)" />
          <div>
            <label className="label">Alt Bump Structure</label>
            <input type="text" className="input" value={bb.bumpAltStructure} onChange={(e) => setBbField("bumpAltStructure", e.target.value)} />
          </div>
          <S k="guarantyPreferred" label="Preferred Guaranty" options={GUARANTY_TYPES} />
          <S k="guarantyFloor" label="Guaranty Floor" options={GUARANTY_TYPES} />
          <F k="operatorMinUnits" label="Min Operator Units" />
          <F k="dscrMin" label="Min DSCR" />
          <F k="ltv" label="LTV (e.g. 0.65)" />
          <F k="interestRate" label="Interest Rate (%)" />
          <F k="amortizationYears" label="Amortization (yrs)" />
          <F k="hhiMin" label="Min HHI ($)" />
          <F k="currentMonthlyIncome" label="Current Monthly Income ($)" />
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

      {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Create Investor"}
      </button>
    </div>
  );
}
