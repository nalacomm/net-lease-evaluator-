"use client";

// FILE CONTAINS BOTH SERVER WRAPPER (default export) AND CLIENT FORM
// Next.js 13+ app router: mixing "use client" at top makes full file client.
// We keep the form logic here and call the API route directly.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { SITE_TYPES, TENANT_LEASE_TYPES } from "@/lib/constants";
import { ArrowLeft, Loader2 } from "lucide-react";

type FormState = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  siteType: string;
  squareFeet: string;
  parkingSpaces: string;
  parkingRatio: string;
  askingRentPsf: string;
  nnnEstimate: string;
  leaseType: string;
  leaseTermOffered: string;
  dailyTraffic: string;
  population1mi: string;
  population3mi: string;
  population5mi: string;
  medianIncome: string;
  coTenants: string;
  zoning: string;
  availableDate: string;
  source: string;
  brokerName: string;
  brokerEmail: string;
  brokerPhone: string;
  notes: string;
};

const EMPTY: FormState = {
  name: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  siteType: "",
  squareFeet: "",
  parkingSpaces: "",
  parkingRatio: "",
  askingRentPsf: "",
  nnnEstimate: "",
  leaseType: "",
  leaseTermOffered: "",
  dailyTraffic: "",
  population1mi: "",
  population3mi: "",
  population5mi: "",
  medianIncome: "",
  coTenants: "",
  zoning: "",
  availableDate: "",
  source: "",
  brokerName: "",
  brokerEmail: "",
  brokerPhone: "",
  notes: "",
};

function SiteIntakeForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      zip: form.zip || null,
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
    };

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const { id } = await res.json();
      router.push(`/sites/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save site.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Basic Info
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Name *</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>
          <div>
            <label className="label">City</label>
            <input
              className="input"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </div>
          <div>
            <label className="label">State</label>
            <input
              className="input"
              maxLength={2}
              value={form.state}
              onChange={(e) => set("state", e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="label">ZIP</label>
            <input
              className="input"
              value={form.zip}
              onChange={(e) => set("zip", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Site Type</label>
            <select
              className="input"
              value={form.siteType}
              onChange={(e) => set("siteType", e.target.value)}
            >
              <option value="">— Select —</option>
              {SITE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Physical */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Physical
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Square Feet</label>
            <input
              className="input"
              type="number"
              step="1"
              value={form.squareFeet}
              onChange={(e) => set("squareFeet", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Parking Spaces</label>
            <input
              className="input"
              type="number"
              step="1"
              value={form.parkingSpaces}
              onChange={(e) => set("parkingSpaces", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Parking Ratio</label>
            <input
              className="input"
              type="number"
              step="0.1"
              value={form.parkingRatio}
              onChange={(e) => set("parkingRatio", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Lease & Rent */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Lease & Rent
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Asking Rent/SF ($)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={form.askingRentPsf}
              onChange={(e) => set("askingRentPsf", e.target.value)}
            />
          </div>
          <div>
            <label className="label">NNN Estimate ($/SF)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={form.nnnEstimate}
              onChange={(e) => set("nnnEstimate", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Lease Type</label>
            <select
              className="input"
              value={form.leaseType}
              onChange={(e) => set("leaseType", e.target.value)}
            >
              <option value="">— Select —</option>
              {TENANT_LEASE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Lease Term Offered (yrs)</label>
            <input
              className="input"
              type="number"
              step="1"
              value={form.leaseTermOffered}
              onChange={(e) => set("leaseTermOffered", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Demographics */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Demographics
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Daily Traffic</label>
            <input
              className="input"
              type="number"
              step="1"
              value={form.dailyTraffic}
              onChange={(e) => set("dailyTraffic", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Population (1 mi)</label>
            <input
              className="input"
              type="number"
              step="1"
              value={form.population1mi}
              onChange={(e) => set("population1mi", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Population (3 mi)</label>
            <input
              className="input"
              type="number"
              step="1"
              value={form.population3mi}
              onChange={(e) => set("population3mi", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Population (5 mi)</label>
            <input
              className="input"
              type="number"
              step="1"
              value={form.population5mi}
              onChange={(e) => set("population5mi", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Median Income ($)</label>
            <input
              className="input"
              type="number"
              step="1"
              value={form.medianIncome}
              onChange={(e) => set("medianIncome", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Site Context */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Site Context
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Co-Tenants</label>
            <input
              className="input"
              value={form.coTenants}
              onChange={(e) => set("coTenants", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Zoning</label>
            <input
              className="input"
              value={form.zoning}
              onChange={(e) => set("zoning", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Available Date</label>
            <input
              className="input"
              type="date"
              value={form.availableDate}
              onChange={(e) => set("availableDate", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Source / Broker */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Source & Broker
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Source</label>
            <input
              className="input"
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Broker Name</label>
            <input
              className="input"
              value={form.brokerName}
              onChange={(e) => set("brokerName", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Broker Email</label>
            <input
              className="input"
              type="email"
              value={form.brokerEmail}
              onChange={(e) => set("brokerEmail", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Broker Phone</label>
            <input
              className="input"
              type="tel"
              value={form.brokerPhone}
              onChange={(e) => set("brokerPhone", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Notes
        </h2>
        <textarea
          className="input min-h-[120px] resize-y"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </section>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Site
        </button>
        <Link href="/sites" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}

export default function NewSitePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/sites"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sites
        </Link>
        <PageHeader title="Add Site" />
      </div>
      <SiteIntakeForm />
    </div>
  );
}
