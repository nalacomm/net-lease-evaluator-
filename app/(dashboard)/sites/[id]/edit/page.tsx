"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, MapPin, X } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { SITE_TYPE_CATEGORIES, TENANT_LEASE_TYPES, QUADRANTS } from "@/lib/constants";

type FormState = {
  name: string; address: string; city: string; state: string; zip: string; quadrant: string;
  siteType: string; squareFeet: string; parkingSpaces: string; parkingRatio: string;
  askingRentPsf: string; nnnEstimate: string; leaseType: string; leaseTermOffered: string;
  dailyTraffic: string; population1mi: string; population3mi: string; population5mi: string;
  medianIncome: string; coTenants: string; zoning: string; availableDate: string;
  source: string; brokerName: string; brokerEmail: string; brokerPhone: string; notes: string;
};

const EMPTY: FormState = {
  name: "", address: "", city: "", state: "", zip: "", quadrant: "", siteType: "",
  squareFeet: "", parkingSpaces: "", parkingRatio: "",
  askingRentPsf: "", nnnEstimate: "", leaseType: "", leaseTermOffered: "",
  dailyTraffic: "", population1mi: "", population3mi: "", population5mi: "",
  medianIncome: "", coTenants: "", zoning: "", availableDate: "",
  source: "", brokerName: "", brokerEmail: "", brokerPhone: "", notes: "",
};

function n(v: number | null | undefined) {
  return v != null ? String(v) : "";
}

export default function EditSitePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [brokerEmails, setBrokerEmails] = useState<string[]>([""]);

  useEffect(() => {
    fetch(`/api/sites/${params.id}`)
      .then((r) => r.json())
      .then((s) => {
        setForm({
          name: s.name ?? "",
          address: s.address ?? "",
          city: s.city ?? "",
          state: s.state ?? "",
          zip: s.zip ?? "",
          quadrant: s.quadrant ?? "",
          siteType: s.siteType ?? "",
          squareFeet: n(s.squareFeet),
          parkingSpaces: n(s.parkingSpaces),
          parkingRatio: n(s.parkingRatio),
          askingRentPsf: n(s.askingRentPsf),
          nnnEstimate: n(s.nnnEstimate),
          leaseType: s.leaseType ?? "",
          leaseTermOffered: n(s.leaseTermOffered),
          dailyTraffic: n(s.dailyTraffic),
          population1mi: n(s.population1mi),
          population3mi: n(s.population3mi),
          population5mi: n(s.population5mi),
          medianIncome: n(s.medianIncome),
          coTenants: s.coTenants ?? "",
          zoning: s.zoning ?? "",
          availableDate: s.availableDate ?? "",
          source: s.source ?? "",
          brokerName: s.brokerName ?? "",
          brokerEmail: s.brokerEmail ?? "",
          brokerPhone: s.brokerPhone ?? "",
          notes: s.notes ?? "",
        });
        const emails = s.brokerEmail
          ? s.brokerEmail.split(",").map((e: string) => e.trim()).filter(Boolean)
          : [];
        setBrokerEmails(emails.length ? emails : [""]);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load site.");
        setLoading(false);
      });
  }, [params.id]);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Annual PSF stored directly — monthly = annual / 12
  const baseRentYr = parseFloat(form.askingRentPsf) || 0;
  const nnnYr = parseFloat(form.nnnEstimate) || 0;
  const totalYr = baseRentYr + nnnYr;
  const totalMo = totalYr / 12;

  function setEmail(i: number, val: string) {
    const next = [...brokerEmails];
    next[i] = val;
    setBrokerEmails(next);
    setForm((prev) => ({ ...prev, brokerEmail: next.filter(Boolean).join(", ") }));
  }

  function addEmail() {
    setBrokerEmails((prev) => [...prev, ""]);
  }

  function removeEmail(i: number) {
    const next = brokerEmails.filter((_, j) => j !== i);
    const safe = next.length ? next : [""];
    setBrokerEmails(safe);
    setForm((prev) => ({ ...prev, brokerEmail: safe.filter(Boolean).join(", ") }));
  }

  async function lookupLocation() {
    const q = locationQuery.trim() || [form.city, form.state, form.zip].filter(Boolean).join(" ");
    if (!q) return;
    setLocationLoading(true);
    setLocationNote("");
    try {
      const res = await fetch("/api/location/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.medianIncome) set("medianIncome", String(Math.round(data.medianIncome)));
      if (data.population1mi) set("population1mi", String(data.population1mi));
      if (data.population3mi) set("population3mi", String(data.population3mi));
      if (data.population5mi) set("population5mi", String(data.population5mi));
      if (data.dailyTraffic) set("dailyTraffic", String(data.dailyTraffic));
      if (data.notes) setLocationNote(data.notes);
    } catch (e) {
      setLocationNote(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLocationLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sites/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          zip: form.zip || null,
          quadrant: form.quadrant || null,
          siteType: form.siteType || null,
          squareFeet: form.squareFeet ? parseFloat(form.squareFeet) : null,
          parkingSpaces: form.parkingSpaces ? parseInt(form.parkingSpaces) : null,
          parkingRatio: form.parkingRatio ? parseFloat(form.parkingRatio) : null,
          askingRentPsf: form.askingRentPsf ? parseFloat(form.askingRentPsf) : null,
          nnnEstimate: form.nnnEstimate ? parseFloat(form.nnnEstimate) : null,
          leaseType: form.leaseType || null,
          leaseTermOffered: form.leaseTermOffered ? parseInt(form.leaseTermOffered) : null,
          dailyTraffic: form.dailyTraffic ? parseInt(form.dailyTraffic) : null,
          population1mi: form.population1mi ? parseInt(form.population1mi) : null,
          population3mi: form.population3mi ? parseInt(form.population3mi) : null,
          population5mi: form.population5mi ? parseInt(form.population5mi) : null,
          medianIncome: form.medianIncome ? parseFloat(form.medianIncome) : null,
          coTenants: form.coTenants || null,
          zoning: form.zoning || null,
          availableDate: form.availableDate || null,
          source: form.source || null,
          brokerName: form.brokerName || null,
          brokerEmail: form.brokerEmail || null,
          brokerPhone: form.brokerPhone || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      router.push(`/sites/${params.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/sites/${params.id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Site
        </Link>
        <PageHeader title="Edit Site" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <section className="card space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Basic Info</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Name *</label>
              <input className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" maxLength={2} value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="label">ZIP</label>
              <input className="input" value={form.zip} onChange={(e) => set("zip", e.target.value)} />
            </div>
            <div>
              <label className="label">Quadrant</label>
              <select className="input" value={form.quadrant} onChange={(e) => set("quadrant", e.target.value)}>
                <option value="">— None —</option>
                {QUADRANTS.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Site Type</label>
              <select className="input" value={form.siteType} onChange={(e) => set("siteType", e.target.value)}>
                <option value="">— Select —</option>
                {SITE_TYPE_CATEGORIES.map((cat) => (
                    <optgroup key={cat.category} label={cat.category}>
                      {cat.types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </optgroup>
                  ))}
              </select>
            </div>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Physical</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Square Feet</label>
              <input className="input" type="number" step="1" value={form.squareFeet} onChange={(e) => set("squareFeet", e.target.value)} />
            </div>
            <div>
              <label className="label">Parking Spaces</label>
              <input className="input" type="number" step="1" value={form.parkingSpaces} onChange={(e) => set("parkingSpaces", e.target.value)} />
            </div>
            <div>
              <label className="label">Parking Ratio (/1000 SF)</label>
              <input className="input" type="number" step="0.1" value={form.parkingRatio} onChange={(e) => set("parkingRatio", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Lease & Rent</h2>

          {/* Annual PSF inputs — monthly derived below */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Base Rent PSF/yr ($)</label>
              <input className="input" type="number" step="0.01" placeholder="e.g. 30.00" value={form.askingRentPsf} onChange={(e) => set("askingRentPsf", e.target.value)} />
            </div>
            <div>
              <label className="label">NNN PSF/yr ($)</label>
              <input className="input" type="number" step="0.01" placeholder="e.g. 9.00" value={form.nnnEstimate} onChange={(e) => set("nnnEstimate", e.target.value)} />
            </div>
            <div>
              <label className="label">Total PSF/yr ($)</label>
              <div className="input bg-gray-50 text-gray-700 flex items-center">
                {totalYr > 0 ? `$${totalYr.toFixed(2)}` : "—"}
              </div>
            </div>
          </div>

          {/* Monthly derived display */}
          {(baseRentYr > 0 || nnnYr > 0) && (
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <div>
                <p className="text-xs text-gray-400">Base/mo</p>
                <p className="font-medium text-gray-800">${(baseRentYr / 12).toFixed(2)}/SF</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">NNN/mo</p>
                <p className="font-medium text-gray-800">${(nnnYr / 12).toFixed(2)}/SF</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Total/mo</p>
                <p className="font-medium text-brand">${totalMo.toFixed(2)}/SF</p>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Lease Type</label>
              <select className="input" value={form.leaseType} onChange={(e) => set("leaseType", e.target.value)}>
                <option value="">— Select —</option>
                {TENANT_LEASE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Lease Term Offered (yrs)</label>
              <input className="input" type="number" step="1" value={form.leaseTermOffered} onChange={(e) => set("leaseTermOffered", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Demographics</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="input h-8 w-48 text-xs"
                placeholder="City, zip, or area"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), lookupLocation())}
              />
              <button type="button" onClick={lookupLocation} disabled={locationLoading} className="btn-secondary h-8 text-xs px-2">
                {locationLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                Lookup
              </button>
            </div>
          </div>
          {locationNote && <p className="text-xs text-gray-500">{locationNote}</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Daily Traffic (VPD)</label>
              <input className="input" type="number" step="1" value={form.dailyTraffic} onChange={(e) => set("dailyTraffic", e.target.value)} />
            </div>
            <div>
              <label className="label">Population (1 mi)</label>
              <input className="input" type="number" step="1" value={form.population1mi} onChange={(e) => set("population1mi", e.target.value)} />
            </div>
            <div>
              <label className="label">Population (3 mi)</label>
              <input className="input" type="number" step="1" value={form.population3mi} onChange={(e) => set("population3mi", e.target.value)} />
            </div>
            <div>
              <label className="label">Population (5 mi)</label>
              <input className="input" type="number" step="1" value={form.population5mi} onChange={(e) => set("population5mi", e.target.value)} />
            </div>
            <div>
              <label className="label">Median Income ($)</label>
              <input className="input" type="number" step="1" value={form.medianIncome} onChange={(e) => set("medianIncome", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Site Context</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Co-Tenants</label>
              <input className="input" value={form.coTenants} onChange={(e) => set("coTenants", e.target.value)} />
            </div>
            <div>
              <label className="label">Zoning</label>
              <input className="input" value={form.zoning} onChange={(e) => set("zoning", e.target.value)} />
            </div>
            <div>
              <label className="label">Available Date</label>
              <input className="input" type="date" value={form.availableDate} onChange={(e) => set("availableDate", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Source & Broker</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Source</label>
              <input className="input" value={form.source} onChange={(e) => set("source", e.target.value)} />
            </div>
            <div>
              <label className="label">Broker Name</label>
              <input className="input" value={form.brokerName} onChange={(e) => set("brokerName", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Broker Email(s)</label>
              <div className="space-y-1">
                {brokerEmails.map((email, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input
                      className="input flex-1"
                      type="email"
                      placeholder="broker@example.com"
                      value={email}
                      onChange={(e) => setEmail(i, e.target.value)}
                    />
                    {brokerEmails.length > 1 && (
                      <button type="button" onClick={() => removeEmail(i)} className="shrink-0 text-gray-400 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addEmail} className="text-xs text-brand hover:underline">
                  + Add another email
                </button>
              </div>
            </div>
            <div>
              <label className="label">Broker Phone</label>
              <input className="input" type="tel" value={form.brokerPhone} onChange={(e) => set("brokerPhone", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Notes</h2>
          <textarea className="input min-h-[100px] resize-y" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </section>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
          <Link href={`/sites/${params.id}`} className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
