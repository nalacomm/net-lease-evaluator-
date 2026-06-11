"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SITE_TYPES, TENANT_LEASE_TYPES } from "@/lib/constants";
import { Loader2, Sparkles, ClipboardList, AlertCircle, Upload, X, MapPin } from "lucide-react";

// ---- Stable helper components (MUST be outside the parent to avoid remount on every render) ----
function BbInput({
  label,
  value,
  onChange,
  inferred,
  missing,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inferred?: boolean;
  missing?: boolean;
}) {
  return (
    <div>
      <label className="label flex items-center gap-1.5">
        {label}
        {missing && <span className="h-2 w-2 rounded-full bg-red-500" title="Missing" />}
        {inferred && !missing && <span className="h-2 w-2 rounded-full bg-amber-400" title="AI-inferred" />}
      </label>
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
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
// ---- End helpers ----

type TenantRequirementsDraft = {
  tenantName: string | null;
  contactName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  minSF: number | null;
  maxSF: number | null;
  preferredSF: number | null;
  minRentPsf: number | null;
  maxRentPsf: number | null;
  leaseType: string | null;
  minParking: number | null;
  minTraffic: number | null;
  minPopulation: number | null;
  minIncome: number | null;
  radiusMiles: number | null;
  minTerm: number | null;
  preferredTerm: number | null;
  targetMarkets: string[];
  siteTypePrefs: string[];
  coTenancy: string | null;
  exclusivity: string | null;
  zoningReqs: string | null;
  additionalNotes: string | null;
  inferredFields: string[];
  missingFields: string[];
  confidenceLevel: string;
  narrativeSummary: string;
};

type Mode = "choose" | "manual" | "ai";

function n(v: number | null | undefined) {
  return v != null ? String(v) : "";
}

type ReqFormState = {
  minSF: string;
  maxSF: string;
  preferredSF: string;
  minRentPsf: string;
  maxRentPsf: string;
  leaseType: string;
  minParking: string;
  minTraffic: string;
  minPopulation: string;
  minIncome: string;
  radiusMiles: string;
  minTerm: string;
  preferredTerm: string;
  coTenancy: string;
  exclusivity: string;
  zoningReqs: string;
  additionalNotes: string;
};

const DEFAULT_REQ: ReqFormState = {
  minSF: "",
  maxSF: "",
  preferredSF: "",
  minRentPsf: "",
  maxRentPsf: "",
  leaseType: "nnn",
  minParking: "",
  minTraffic: "",
  minPopulation: "",
  minIncome: "",
  radiusMiles: "",
  minTerm: "",
  preferredTerm: "",
  coTenancy: "",
  exclusivity: "",
  zoningReqs: "",
  additionalNotes: "",
};

export function TenantOnboarding() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");

  const [narrative, setNarrative] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [wizarding, setWizarding] = useState(false);
  const [wizardResult, setWizardResult] = useState<TenantRequirementsDraft | null>(null);
  const [wizardError, setWizardError] = useState("");

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [req, setReq] = useState<ReqFormState>(DEFAULT_REQ);
  const [targetMarkets, setTargetMarkets] = useState("");
  const [siteTypePrefs, setSiteTypePrefs] = useState<string[]>([]);

  const [locationQuery, setLocationQuery] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationNote, setLocationNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function setReqField(k: string, v: string) {
    setReq((prev) => ({ ...prev, [k]: v }));
  }

  function toggleSiteType(v: string) {
    setSiteTypePrefs((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  async function lookupLocation() {
    if (!locationQuery.trim()) return;
    setLocationLoading(true);
    setLocationNote("");
    try {
      const res = await fetch("/api/location/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: locationQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.medianIncome) setReqField("minIncome", String(Math.round(data.medianIncome)));
      if (data.population3mi) setReqField("minPopulation", String(data.population3mi));
      if (data.dailyTraffic) setReqField("minTraffic", String(data.dailyTraffic));
      if (data.notes) setLocationNote(data.notes);
      // Add location to target markets
      const q = locationQuery.trim();
      setTargetMarkets((prev) => {
        const existing = prev.split(",").map((s) => s.trim()).filter(Boolean);
        if (!existing.some((m) => m.toLowerCase() === q.toLowerCase())) {
          return existing.length ? `${prev}, ${q}` : q;
        }
        return prev;
      });
    } catch (e) {
      setLocationNote(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLocationLoading(false);
    }
  }

  function applyWizard(d: TenantRequirementsDraft) {
    if (d.tenantName && !name) setName(d.tenantName);
    if (d.contactName && !contact) setContact(d.contactName);
    if (d.company && !company) setCompany(d.company);
    if (d.email && !email) setEmail(d.email);
    if (d.phone && !phone) setPhone(d.phone);
    setReq({
      minSF: n(d.minSF),
      maxSF: n(d.maxSF),
      preferredSF: n(d.preferredSF),
      minRentPsf: n(d.minRentPsf),
      maxRentPsf: n(d.maxRentPsf),
      leaseType: d.leaseType ?? "nnn",
      minParking: n(d.minParking),
      minTraffic: n(d.minTraffic),
      minPopulation: n(d.minPopulation),
      minIncome: n(d.minIncome),
      radiusMiles: n(d.radiusMiles),
      minTerm: n(d.minTerm),
      preferredTerm: n(d.preferredTerm),
      coTenancy: d.coTenancy ?? "",
      exclusivity: d.exclusivity ?? "",
      zoningReqs: d.zoningReqs ?? "",
      additionalNotes: d.additionalNotes ?? "",
    });
    setTargetMarkets((d.targetMarkets ?? []).join(", "));
    setSiteTypePrefs(d.siteTypePrefs ?? []);
    if (d.additionalNotes) setNotes(d.additionalNotes);
    setWizardResult(d);
    setMode("manual");
  }

  async function runWizard() {
    setWizarding(true);
    setWizardError("");
    try {
      const fd = new FormData();
      fd.append("narrative", narrative);
      files.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/tenants/requirements/wizard", { method: "POST", body: fd });
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
      const marketsArray = targetMarkets
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, company, contact, email, phone, notes,
          requirements: {
            ...req,
            minSF: req.minSF ? Number(req.minSF) : null,
            maxSF: req.maxSF ? Number(req.maxSF) : null,
            preferredSF: req.preferredSF ? Number(req.preferredSF) : null,
            minRentPsf: req.minRentPsf ? Number(req.minRentPsf) : null,
            maxRentPsf: req.maxRentPsf ? Number(req.maxRentPsf) : null,
            minParking: req.minParking ? Number(req.minParking) : null,
            minTraffic: req.minTraffic ? Number(req.minTraffic) : null,
            minPopulation: req.minPopulation ? Number(req.minPopulation) : null,
            minIncome: req.minIncome ? Number(req.minIncome) : null,
            radiusMiles: req.radiusMiles ? Number(req.radiusMiles) : null,
            minTerm: req.minTerm ? Number(req.minTerm) : null,
            preferredTerm: req.preferredTerm ? Number(req.preferredTerm) : null,
            targetMarkets: marketsArray,
            siteTypePrefs,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      router.push(`/tenants/${data.id}`);
      router.refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed");
      setSaving(false);
    }
  }

  if (mode === "choose") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <button onClick={() => setMode("manual")} className="card flex flex-col items-start gap-3 text-left hover:border-brand">
          <ClipboardList className="h-8 w-8 text-brand" />
          <div>
            <p className="font-semibold text-gray-900">Manual entry</p>
            <p className="text-sm text-gray-500">You know the site requirements. Fill in the form directly.</p>
          </div>
        </button>
        <button onClick={() => setMode("ai")} className="card flex flex-col items-start gap-3 text-left hover:border-brand">
          <Sparkles className="h-8 w-8 text-brand" />
          <div>
            <p className="font-semibold text-gray-900">AI Requirements Wizard</p>
            <p className="text-sm text-gray-500">Describe what the tenant needs, upload site criteria docs — AI builds the requirements draft for you to review.</p>
          </div>
        </button>
      </div>
    );
  }

  if (mode === "ai") {
    return (
      <div className="space-y-4">
        <button onClick={() => setMode("choose")} className="btn-secondary text-sm">← Back</button>
        <div className="card space-y-4">
          <div>
            <label className="label">Describe the tenant and their site requirements</label>
            <textarea
              className="input min-h-[140px]"
              placeholder="e.g. Fast-casual burger brand expanding in Texas. Needs freestanding endcap, 2,000–2,500 SF, 30+ parking spots, 25,000+ traffic count, NNN lease."
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Upload supporting docs (optional)</label>
            <p className="mb-2 text-xs text-gray-500">Site criteria sheets, LOIs, or deal flyers.</p>
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
            {wizarding
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Building requirements…</>
              : <><Sparkles className="h-4 w-4" /> Build Requirements with AI</>
            }
          </button>
        </div>
      </div>
    );
  }

  // Manual / Review form
  const inferred = new Set(wizardResult?.inferredFields ?? []);
  const missing = new Set(wizardResult?.missingFields ?? []);

  return (
    <div className="space-y-4">
      <button onClick={() => setMode("choose")} className="btn-secondary text-sm">← Back</button>

      {wizardResult && (
        <div className="card">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <span className="font-medium">AI-generated requirements — review before saving</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              wizardResult.confidenceLevel === "high" ? "bg-green-100 text-green-800" :
              wizardResult.confidenceLevel === "medium" ? "bg-yellow-100 text-yellow-800" :
              "bg-red-100 text-red-800"
            }`}>{wizardResult.confidenceLevel.toUpperCase()}</span>
          </div>
          {wizardResult.narrativeSummary && (
            <p className="mt-2 text-sm text-gray-600">{wizardResult.narrativeSummary}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">Amber = AI-inferred. Red = missing. Edit before saving.</p>
        </div>
      )}

      <div className="card grid gap-3 sm:grid-cols-2">
        <h3 className="col-span-full font-semibold">Tenant Info</h3>
        <div>
          <label className="label">Name *</label>
          <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Company</label>
          <input type="text" className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div>
          <label className="label">Contact</label>
          <input type="text" className="input" value={contact} onChange={(e) => setContact(e.target.value)} />
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
          <label className="label">Notes</label>
          <textarea className="input min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3 font-semibold">Site Requirements</h3>

        {/* Location lookup */}
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium text-gray-600">Auto-fill demographics by location</p>
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="City, zip code, or area (e.g. Bethesda MD, 20814)"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookupLocation()}
            />
            <button
              type="button"
              onClick={lookupLocation}
              disabled={locationLoading || !locationQuery.trim()}
              className="btn-secondary shrink-0"
            >
              {locationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Lookup
            </button>
          </div>
          {locationNote && (
            <p className="mt-1.5 text-xs text-gray-500">{locationNote}</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <BbInput label="Min SF" value={req.minSF} onChange={(v) => setReqField("minSF", v)} inferred={inferred.has("minSF")} missing={missing.has("minSF") && !req.minSF} />
          <BbInput label="Max SF" value={req.maxSF} onChange={(v) => setReqField("maxSF", v)} inferred={inferred.has("maxSF")} missing={missing.has("maxSF") && !req.maxSF} />
          <BbInput label="Preferred SF" value={req.preferredSF} onChange={(v) => setReqField("preferredSF", v)} inferred={inferred.has("preferredSF")} />
          <BbInput label="Min Rent PSF ($)" value={req.minRentPsf} onChange={(v) => setReqField("minRentPsf", v)} inferred={inferred.has("minRentPsf")} />
          <BbInput label="Max Rent PSF ($)" value={req.maxRentPsf} onChange={(v) => setReqField("maxRentPsf", v)} inferred={inferred.has("maxRentPsf")} />
          <BbSelect label="Lease Type" value={req.leaseType} onChange={(v) => setReqField("leaseType", v)} options={TENANT_LEASE_TYPES} />
          <BbInput label="Min Parking (spaces)" value={req.minParking} onChange={(v) => setReqField("minParking", v)} inferred={inferred.has("minParking")} missing={missing.has("minParking") && !req.minParking} />
          <BbInput label="Min Traffic Count" value={req.minTraffic} onChange={(v) => setReqField("minTraffic", v)} inferred={inferred.has("minTraffic")} missing={missing.has("minTraffic") && !req.minTraffic} />
          <BbInput label="Min Population (1-mi)" value={req.minPopulation} onChange={(v) => setReqField("minPopulation", v)} inferred={inferred.has("minPopulation")} />
          <BbInput label="Min Household Income ($)" value={req.minIncome} onChange={(v) => setReqField("minIncome", v)} inferred={inferred.has("minIncome")} />
          <BbInput label="Exclusion Radius (miles)" value={req.radiusMiles} onChange={(v) => setReqField("radiusMiles", v)} inferred={inferred.has("radiusMiles")} />
          <BbInput label="Min Lease Term (yrs)" value={req.minTerm} onChange={(v) => setReqField("minTerm", v)} inferred={inferred.has("minTerm")} missing={missing.has("minTerm") && !req.minTerm} />
          <BbInput label="Preferred Lease Term (yrs)" value={req.preferredTerm} onChange={(v) => setReqField("preferredTerm", v)} inferred={inferred.has("preferredTerm")} />
        </div>

        <div className="mt-4">
          <label className="label">Target Markets (comma-separated)</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Austin TX, Dallas TX, Nashville TN"
            value={targetMarkets}
            onChange={(e) => setTargetMarkets(e.target.value)}
          />
        </div>

        <div className="mt-4">
          <label className="label">Site Type Preferences</label>
          <div className="flex flex-wrap gap-2">
            {SITE_TYPES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleSiteType(s.value)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  siteTypePrefs.includes(s.value)
                    ? "border-brand bg-brand text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label flex items-center gap-1.5">
              Co-Tenancy Requirements
              {missing.has("coTenancy") && !req.coTenancy && <span className="h-2 w-2 rounded-full bg-red-500" title="Missing" />}
              {inferred.has("coTenancy") && req.coTenancy && <span className="h-2 w-2 rounded-full bg-amber-400" title="AI-inferred" />}
            </label>
            <input type="text" className="input" value={req.coTenancy} onChange={(e) => setReqField("coTenancy", e.target.value)} />
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              Exclusivity
              {inferred.has("exclusivity") && req.exclusivity && <span className="h-2 w-2 rounded-full bg-amber-400" title="AI-inferred" />}
            </label>
            <input type="text" className="input" value={req.exclusivity} onChange={(e) => setReqField("exclusivity", e.target.value)} />
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              Zoning Requirements
              {inferred.has("zoningReqs") && req.zoningReqs && <span className="h-2 w-2 rounded-full bg-amber-400" title="AI-inferred" />}
            </label>
            <input type="text" className="input" value={req.zoningReqs} onChange={(e) => setReqField("zoningReqs", e.target.value)} />
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              Additional Notes
              {inferred.has("additionalNotes") && req.additionalNotes && <span className="h-2 w-2 rounded-full bg-amber-400" title="AI-inferred" />}
            </label>
            <input type="text" className="input" value={req.additionalNotes} onChange={(e) => setReqField("additionalNotes", e.target.value)} />
          </div>
        </div>
      </div>

      {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Create Tenant"}
      </button>
    </div>
  );
}
