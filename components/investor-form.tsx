"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ASSET_TYPES, LEASE_TYPES, GUARANTY_TYPES } from "@/lib/constants";
import { Loader2 } from "lucide-react";

export function InvestorForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    entityName: "",
    email: "",
    phone: "",
    notes: "",
    capRateMin: "6.75",
    capRateTarget: "7.0",
    priceMax: "7000000",
    priceStretch: "7500000",
    leaseTypePreferred: "absolute_nnn",
    leaseTypeAcceptable: "nnn",
    termMinYears: "10",
    termPreferredYears: "15",
    bumpMinPercent: "2.0",
    bumpAltStructure: "10% every 5 years",
    guarantyPreferred: "corporate",
    guarantyAcceptable: "multi_unit_franchisee",
    guarantyFloor: "single_personal",
    operatorMinUnits: "12",
    dscrMin: "1.35",
    ltv: "0.65",
    interestRate: "7.0",
    amortizationYears: "25",
    hhiMin: "100000",
    currentMonthlyIncome: "0",
  });
  const [preferred, setPreferred] = useState<string[]>(["eclc"]);
  const [acceptable, setAcceptable] = useState<string[]>([]);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function toggle(list: string[], setList: (v: string[]) => void, v: string) {
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function save() {
    if (!form.name) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          entityName: form.entityName,
          email: form.email,
          phone: form.phone,
          notes: form.notes,
          buyBox: {
            ...form,
            assetTypesPreferred: preferred,
            assetTypesAcceptable: acceptable,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      router.push(`/investors/${data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setSaving(false);
    }
  }

  const Field = ({
    k,
    label,
    type = "text",
  }: {
    k: keyof typeof form;
    label: string;
    type?: string;
  }) => (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        value={form[k]}
        onChange={(e) => set(k, e.target.value)}
      />
    </div>
  );

  const Select = ({
    k,
    label,
    options,
  }: {
    k: keyof typeof form;
    label: string;
    options: { value: string; label: string }[];
  }) => (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={form[k]} onChange={(e) => set(k, e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 sm:grid-cols-2">
        <Field k="name" label="Name *" />
        <Field k="entityName" label="Entity Name" />
        <Field k="email" label="Email" type="email" />
        <Field k="phone" label="Phone" />
      </div>

      <div className="card">
        <h3 className="mb-3 font-semibold">Buy Box</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field k="capRateMin" label="Cap Rate Floor (%)" type="number" />
          <Field k="capRateTarget" label="Cap Rate Target (%)" type="number" />
          <Field k="priceMax" label="Max Price ($)" type="number" />
          <Field k="priceStretch" label="Stretch Price ($)" type="number" />
          <Select k="leaseTypePreferred" label="Preferred Lease" options={LEASE_TYPES} />
          <Select k="leaseTypeAcceptable" label="Acceptable Lease" options={LEASE_TYPES} />
          <Field k="termMinYears" label="Min Term (yrs)" type="number" />
          <Field k="termPreferredYears" label="Preferred Term (yrs)" type="number" />
          <Field k="bumpMinPercent" label="Min Bump (%)" type="number" />
          <Field k="bumpAltStructure" label="Alt Bump Structure" />
          <Select k="guarantyPreferred" label="Preferred Guaranty" options={GUARANTY_TYPES} />
          <Select k="guarantyFloor" label="Guaranty Floor" options={GUARANTY_TYPES} />
          <Field k="operatorMinUnits" label="Min Operator Units" type="number" />
          <Field k="dscrMin" label="Min DSCR" type="number" />
          <Field k="ltv" label="LTV (0-1)" type="number" />
          <Field k="interestRate" label="Interest Rate (%)" type="number" />
          <Field k="amortizationYears" label="Amortization (yrs)" type="number" />
          <Field k="hhiMin" label="Min HHI ($)" type="number" />
          <Field k="currentMonthlyIncome" label="Current Monthly Income ($)" type="number" />
        </div>

        <div className="mt-4">
          <label className="label">Preferred Asset Types</label>
          <div className="flex flex-wrap gap-2">
            {ASSET_TYPES.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => toggle(preferred, setPreferred, a.value)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  preferred.includes(a.value)
                    ? "border-brand bg-brand text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <label className="label">Acceptable Asset Types</label>
          <div className="flex flex-wrap gap-2">
            {ASSET_TYPES.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => toggle(acceptable, setAcceptable, a.value)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  acceptable.includes(a.value)
                    ? "border-brand bg-brand text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </>
        ) : (
          "Create Investor"
        )}
      </button>
    </div>
  );
}
