"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fmtMoney } from "@/lib/format";
import { GRADE_COLORS } from "@/lib/format";
import clsx from "clsx";
import { Loader2, Pencil, Trash2, Copy, Check, ChevronDown, ChevronRight } from "lucide-react";

type TenantRequirements = {
  id: string;
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
  confidenceLevel: string | null;
  narrativeSummary: string | null;
};

type SiteAssignment = {
  id: string;
  score: number | null;
  grade: string | null;
  site: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    askingRentPsf: number | null;
  };
};

type Campaign = {
  id: string;
  title: string;
  html: string;
  createdAt: string;
};

type Tenant = {
  id: string;
  name: string;
  company: string | null;
  contact: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  requirements: TenantRequirements | null;
  siteAssignments: SiteAssignment[];
  campaigns: Campaign[];
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-2 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value ?? "—"}</span>
    </div>
  );
}

function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-gray-400 text-xs">—</span>;
  const cls = GRADE_COLORS[grade] ?? "bg-gray-400 text-white";
  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center rounded font-bold h-6 w-6 text-xs",
        cls
      )}
    >
      {grade}
    </span>
  );
}

export function TenantProfile({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignHtml, setCampaignHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  async function deleteTenant() {
    if (!confirm("Delete this tenant? This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/tenants/${tenant.id}`, { method: "DELETE" });
    router.push("/tenants");
    router.refresh();
  }

  async function generateCampaign() {
    setCampaignLoading(true);
    setCampaignHtml(null);
    try {
      const res = await fetch(`/api/tenants/${tenant.id}/campaign`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.html) {
        setCampaignHtml(data.html);
        router.refresh();
      }
    } finally {
      setCampaignLoading(false);
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const req = tenant.requirements;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
            {tenant.company && (
              <p className="text-sm text-gray-500">{tenant.company}</p>
            )}
            <div className="mt-2 space-y-0.5 text-sm text-gray-600">
              {tenant.contact && <p>{tenant.contact}</p>}
              {tenant.email && (
                <p>
                  <a href={`mailto:${tenant.email}`} className="text-brand underline">
                    {tenant.email}
                  </a>
                </p>
              )}
              {tenant.phone && <p>{tenant.phone}</p>}
            </div>
            {tenant.notes && (
              <p className="mt-2 text-sm text-gray-500">{tenant.notes}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/tenants/${tenant.id}/edit`} className="btn-secondary">
              <Pencil className="h-4 w-4" /> Edit
            </Link>
            <button
              onClick={deleteTenant}
              disabled={deleting}
              className="btn-secondary text-red-600 hover:border-red-300 hover:bg-red-50"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="card">
        <h2 className="mb-3 font-semibold text-gray-900">Requirements</h2>
        {!req ? (
          <div className="flex flex-col items-center py-6 text-center">
            <p className="text-sm text-gray-500 mb-3">No requirements set.</p>
            <Link href={`/tenants/${tenant.id}/requirements`} className="btn-primary">
              Build Requirements
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {req.narrativeSummary && (
              <div className="md:col-span-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                {req.narrativeSummary}
              </div>
            )}

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Space
              </h3>
              <Row label="Min SF" value={req.minSF?.toLocaleString()} />
              <Row label="Max SF" value={req.maxSF?.toLocaleString()} />
              <Row label="Preferred SF" value={req.preferredSF?.toLocaleString()} />
              <Row label="Lease Type" value={req.leaseType} />
              <Row label="Min Term" value={req.minTerm ? `${req.minTerm} yrs` : null} />
              <Row
                label="Preferred Term"
                value={req.preferredTerm ? `${req.preferredTerm} yrs` : null}
              />
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Rent & Parking
              </h3>
              <Row
                label="Min Rent PSF"
                value={req.minRentPsf ? `$${req.minRentPsf.toFixed(2)}` : null}
              />
              <Row
                label="Max Rent PSF"
                value={req.maxRentPsf ? `$${req.maxRentPsf.toFixed(2)}` : null}
              />
              <Row
                label="Min Parking"
                value={req.minParking ? `${req.minParking} spaces` : null}
              />
              <Row
                label="Radius"
                value={req.radiusMiles ? `${req.radiusMiles} mi` : null}
              />
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Demographics
              </h3>
              <Row
                label="Min Traffic"
                value={req.minTraffic?.toLocaleString()}
              />
              <Row
                label="Min Population"
                value={req.minPopulation?.toLocaleString()}
              />
              <Row
                label="Min Income"
                value={req.minIncome ? fmtMoney(req.minIncome) : null}
              />
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Site Preferences
              </h3>
              <Row
                label="Site Types"
                value={req.siteTypePrefs.length ? req.siteTypePrefs.join(", ") : null}
              />
              <Row
                label="Co-Tenancy"
                value={req.coTenancy}
              />
              <Row label="Exclusivity" value={req.exclusivity} />
              <Row label="Zoning" value={req.zoningReqs} />
            </div>

            {req.targetMarkets.length > 0 && (
              <div className="md:col-span-2">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Target Markets
                </h3>
                <div className="flex flex-wrap gap-1">
                  {req.targetMarkets.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {req.additionalNotes && (
              <div className="md:col-span-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                {req.additionalNotes}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sites */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Assigned Sites ({tenant.siteAssignments.length})
          </h2>
          <Link href="/sites" className="btn-secondary text-sm">
            Assign Sites
          </Link>
        </div>

        {tenant.siteAssignments.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            No sites assigned yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tenant.siteAssignments.map((sa) => (
              <li key={sa.id} className="py-3">
                <Link
                  href={`/sites/${sa.site.id}?tenantId=${tenant.id}`}
                  className="flex items-center justify-between gap-3 hover:bg-gray-50 -mx-2 px-2 rounded"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {sa.site.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sa.site.address
                        ? `${sa.site.address}${sa.site.city ? `, ${sa.site.city}` : ""}${sa.site.state ? `, ${sa.site.state}` : ""}`
                        : sa.site.city
                        ? `${sa.site.city}${sa.site.state ? `, ${sa.site.state}` : ""}`
                        : "—"}
                    </p>
                    {sa.site.askingRentPsf != null && (
                      <p className="text-xs text-gray-400">
                        ${sa.site.askingRentPsf.toFixed(2)} PSF asking
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <GradeBadge grade={sa.grade} />
                    {sa.score != null && (
                      <span className="text-sm font-semibold text-gray-600">
                        {sa.score.toFixed(0)}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Campaigns */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Campaigns</h2>
          <button
            onClick={generateCampaign}
            disabled={campaignLoading}
            className="btn-primary text-sm"
          >
            {campaignLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              "Generate Campaign HTML"
            )}
          </button>
        </div>

        {campaignHtml && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Generated HTML
              </span>
              <button
                onClick={() => copyToClipboard(campaignHtml)}
                className="btn-secondary text-xs"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-green-600" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100 max-h-64">
              {campaignHtml}
            </pre>
          </div>
        )}

        {tenant.campaigns.length === 0 && !campaignHtml ? (
          <p className="py-4 text-center text-sm text-gray-400">
            No campaigns yet. Generate one above.
          </p>
        ) : (
          <ul className="space-y-2">
            {tenant.campaigns.map((c) => (
              <li key={c.id} className="rounded-lg border border-gray-200">
                <button
                  onClick={() =>
                    setExpandedCampaign(expandedCampaign === c.id ? null : c.id)
                  }
                  className="flex w-full items-center justify-between px-3 py-2 text-sm"
                >
                  <span className="font-medium text-gray-800">{c.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                    <ChevronDown
                      className={clsx(
                        "h-4 w-4 text-gray-400 transition",
                        expandedCampaign === c.id ? "rotate-180" : ""
                      )}
                    />
                  </div>
                </button>
                {expandedCampaign === c.id && (
                  <div className="border-t border-gray-100 px-3 pb-3 pt-2">
                    <div className="flex justify-end mb-1">
                      <button
                        onClick={() => copyToClipboard(c.html)}
                        className="btn-secondary text-xs"
                      >
                        <Copy className="h-3 w-3" /> Copy HTML
                      </button>
                    </div>
                    <pre className="overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100 max-h-48">
                      {c.html}
                    </pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
