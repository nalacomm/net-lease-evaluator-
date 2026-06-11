"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SITE_TYPES, TENANT_LEASE_TYPES } from "@/lib/constants";
import { Loader2 } from "lucide-react";

// Stable helpers defined OUTSIDE component to avoid remount on every keystroke
function TInput({
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

function TSelect({
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
        <option value="">— select —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type TenantRequirements = {
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
  coTenancy: string | null;
  exclusivity: string | null;
  zoningReqs: string | null;
  siteTypePrefs: string[];
  additionalNotes: string | null;
};

type TenantWithRequirements = {
  id: string;
  name: string;
  company: string | null;
  contact: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  requirements: TenantRequirements | null;
};

function n(v: number | null | undefined) {
  return v != null ? String(v) : "";
}

export function TenantEditForm({ tenant }: { tenant: TenantWithRequirements }) {
  const router = useRouter();
  const req = tenant.requirements;

  const [name, setName] = useState(tenant.name);
  const [company, setCompany] = useState(tenant.company ?? "");
  const [contact, setContact] = useState(tenant.contact ?? "");
  const [email, setEmail] = useState(tenant.email ?? "");
  const [phone, setPhone] = useState(tenant.phone ?? "");
  const [notes, setNotes] = useState(tenant.notes ?? "");

  const [form, setForm] = useState({
    minSF: n(req?.minSF),
    maxSF: n(req?.maxSF),
    preferredSF: n(req?.preferredSF),
    minRentPsf: n(req?.minRentPsf),
    maxRentPsf: n(req?.maxRentPsf),
    leaseType: req?.leaseType ?? "",
    minParking: n(req?.minParking),
    minTraffic: n(req?.minTraffic),
    minPopulation: n(req?.minPopulation),
    minIncome: n(req?.minIncome),
    radiusMiles: n(req?.radiusMiles),
    minTerm: n(req?.minTerm),
    preferredTerm: n(req?.preferredTerm),
    coTenancy: req?.coTenancy ?? "",
    exclusivity: req?.exclusivity ?? "",
    zoningReqs: req?.zoningReqs ?? "",
    additionalNotes: req?.additionalNotes ?? "",
  });
  const [targetMarkets, setTargetMarkets] = useState((req?.targetMarkets ?? []).join(", "));
  const [siteTypePrefs, setSiteTypePrefs] = useState<string[]>(req?.siteTypePrefs ?? []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setF(k: string, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function toggleSiteType(v: string) {
    setSiteTypePrefs((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  async function save() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const marketsArray = targetMarkets
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          company,
          contact,
          email,
          phone,
          notes,
          requirements: {
            ...form,
            targetMarkets: marketsArray,
            siteTypePrefs,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      router.push(`/tenants/${tenant.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 sm:grid-cols-2">
        <h3 className="col-span-full font-semibold">Tenant Info</h3>
        <div>
          <label className="label">Name *</label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Company / Brand</label>
          <input
            type="text"
            className="input"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Contact</label>
          <input
            type="text"
            className="input"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="text"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            type="text"
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="col-span-full">
          <label className="label">Notes</label>
          <textarea
            className="input min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3 font-semibold">Site Requirements</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <TInput label="Min SF" value={form.minSF} onChange={(v) => setF("minSF", v)} />
          <TInput label="Max SF" value={form.maxSF} onChange={(v) => setF("maxSF", v)} />
          <TInput label="Preferred SF" value={form.preferredSF} onChange={(v) => setF("preferredSF", v)} />
          <TInput label="Min Rent PSF ($)" value={form.minRentPsf} onChange={(v) => setF("minRentPsf", v)} />
          <TInput label="Max Rent PSF ($)" value={form.maxRentPsf} onChange={(v) => setF("maxRentPsf", v)} />
          <TSelect
            label="Lease Type"
            value={form.leaseType}
            onChange={(v) => setF("leaseType", v)}
            options={TENANT_LEASE_TYPES}
          />
          <TInput label="Min Parking Spaces" value={form.minParking} onChange={(v) => setF("minParking", v)} />
          <TInput label="Min Daily Traffic" value={form.minTraffic} onChange={(v) => setF("minTraffic", v)} />
          <TInput label="Min Population (3mi)" value={form.minPopulation} onChange={(v) => setF("minPopulation", v)} />
          <TInput label="Min Household Income ($)" value={form.minIncome} onChange={(v) => setF("minIncome", v)} />
          <TInput label="Radius (miles)" value={form.radiusMiles} onChange={(v) => setF("radiusMiles", v)} />
          <TInput label="Min Term (yrs)" value={form.minTerm} onChange={(v) => setF("minTerm", v)} />
          <TInput label="Preferred Term (yrs)" value={form.preferredTerm} onChange={(v) => setF("preferredTerm", v)} />
        </div>

        <div className="mt-4">
          <label className="label">Target Markets (comma-separated)</label>
          <input
            type="text"
            className="input"
            value={targetMarkets}
            onChange={(e) => setTargetMarkets(e.target.value)}
            placeholder="Dallas, Houston, Austin"
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
            <label className="label">Co-Tenancy</label>
            <input
              type="text"
              className="input"
              value={form.coTenancy}
              onChange={(e) => setF("coTenancy", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Exclusivity</label>
            <input
              type="text"
              className="input"
              value={form.exclusivity}
              onChange={(e) => setF("exclusivity", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Zoning Requirements</label>
            <input
              type="text"
              className="input"
              value={form.zoningReqs}
              onChange={(e) => setF("zoningReqs", e.target.value)}
            />
          </div>
          <div className="col-span-full">
            <label className="label">Additional Notes</label>
            <textarea
              className="input min-h-[80px]"
              value={form.additionalNotes}
              onChange={(e) => setF("additionalNotes", e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </button>
    </div>
  );
}
