"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lightbulb, Pencil, Trash2, FileDown } from "lucide-react";
import clsx from "clsx";
import { GradeBadge, StatusPill } from "@/components/ui";
import { labelFor, SITE_TYPES, TENANT_LEASE_TYPES } from "@/lib/constants";

type Tenant = {
  id: string;
  name: string;
};

type Requirements = {
  minSF?: number | null;
  maxSF?: number | null;
  leaseTermYears?: number | null;
  minTrafficCount?: number | null;
  preferredSiteTypes?: string[] | null;
  [key: string]: unknown;
};

type GapAnalysisData = {
  isExceptional: boolean;
  exceptionalReason: string | null;
  buyBoxAdjustments: {
    field: string;
    currentValue: string;
    requiredValue: string;
    impact: string;
  }[];
  verdict: string;
};

type SiteAssignment = {
  id: string;
  tenantId: string;
  score: number | null;
  grade: string | null;
  gapAnalysis: GapAnalysisData | null;
  scoreBreakdown: { category: string; points: number; max: number; status: string; detail: string }[] | null;
  tenant: Tenant;
  requirements: Requirements | null;
};

type SiteNewsFlag = {
  id: string;
  relevance: string | null;
  impact: string | null;
  newsItem: {
    headline: string;
    source: string | null;
    publishedAt: string | null;
  };
};

type Site = {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  quadrant: string | null;
  siteType: string | null;
  availableDate: string | null;
  squareFeet: number | null;
  parkingSpaces: number | null;
  parkingRatio: number | null;
  askingRentPerSF: number | null;
  nnnEstimate: number | null;
  leaseType: string | null;
  leaseTermOffered: number | null;
  dailyTrafficCount: number | null;
  population1Mile: number | null;
  population3Mile: number | null;
  population5Mile: number | null;
  medianIncome: number | null;
  coTenants: string | null;
  zoning: string | null;
  brokerName: string | null;
  brokerEmail: string | null;
  brokerPhone: string | null;
  assignments: SiteAssignment[];
  newsFlags: SiteNewsFlag[];
};

function Metric({ label, value, highlight, hint }: { label: string; value: React.ReactNode; highlight?: boolean; hint?: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-0.5 font-semibold ${highlight ? "text-brand" : "text-gray-900"}`}>{value ?? "—"}</p>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function ImpactStatus(impact: string | null): "pass" | "fail" | "warn" | "info" {
  if (impact === "positive") return "pass";
  if (impact === "negative") return "fail";
  if (impact === "watch") return "warn";
  return "info";
}

function GapAnalysisBlock({
  analysis,
  onRefresh,
  loading,
}: {
  analysis: GapAnalysisData;
  onRefresh: () => void;
  loading: boolean;
}) {
  const adjustments: GapAnalysisData["buyBoxAdjustments"] =
    analysis.buyBoxAdjustments ??
    ((analysis as Record<string, unknown>)["requirementAdjustments"] as GapAnalysisData["buyBoxAdjustments"]) ??
    [];
  return (
    <div
      className={clsx(
        "mt-3 rounded-lg border-2 p-3",
        analysis.isExceptional
          ? "border-amber-400 bg-amber-50"
          : "border-gray-200 bg-white"
      )}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Lightbulb
          className={clsx(
            "h-4 w-4",
            analysis.isExceptional ? "text-amber-600" : "text-gray-400"
          )}
        />
        <span className="font-semibold text-sm text-gray-900">
          {analysis.isExceptional ? "Exceptional Flag" : "Gap Analysis"}
        </span>
        {analysis.isExceptional && (
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
            Worth a look
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="ml-auto text-xs text-gray-400 hover:text-brand"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "↺ Refresh"}
        </button>
      </div>
      <p className="text-sm text-gray-700 mb-2">{analysis.verdict}</p>
      {analysis.exceptionalReason && (
        <p className="text-sm text-amber-800 mb-2 font-medium">
          {analysis.exceptionalReason}
        </p>
      )}
      {adjustments.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Adjustments needed
          </p>
          <ul className="space-y-1">
            {adjustments.map((a, i) => (
              <li
                key={i}
                className="flex flex-wrap items-start gap-2 text-sm"
              >
                <span className="font-medium text-gray-800 w-36 shrink-0">
                  {a.field}
                </span>
                <span className="text-red-600 line-through">{a.currentValue}</span>
                <span className="text-gray-400">→</span>
                <span className="text-green-700 font-medium">{a.requiredValue}</span>
                <span className="text-gray-500">{a.impact}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SiteProfile({
  site,
  availableTenants = [],
}: {
  site: Site;
  availableTenants?: Tenant[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<"overview" | "scoring" | "news">("overview");
  const [assignments, setAssignments] = useState<SiteAssignment[]>(
    site.assignments ?? []
  );
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [gapLoadingId, setGapLoadingId] = useState<string | null>(null);
  const [gapResults, setGapResults] = useState<Record<string, GapAnalysisData>>(
    () => {
      const initial: Record<string, GapAnalysisData> = {};
      for (const a of site.assignments ?? []) {
        if (a.gapAnalysis) initial[a.tenantId] = a.gapAnalysis;
      }
      return initial;
    }
  );

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "scoring", label: `Scoring (${assignments.length})` },
    { id: "news", label: `News (${site.newsFlags.length})` },
  ] as const;

  async function assignTenant() {
    if (!selectedTenantId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/sites/${site.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: selectedTenantId }),
      });
      const data = await res.json();
      if (res.ok) {
        const tenant = availableTenants.find((t) => t.id === selectedTenantId);
        setAssignments((prev) => [
          ...prev.filter((a) => a.tenantId !== selectedTenantId),
          {
            id: data.id ?? selectedTenantId,
            tenantId: selectedTenantId,
            score: data.score ?? null,
            grade: data.grade ?? null,
            gapAnalysis: null,
            scoreBreakdown: null,
            tenant: tenant ?? { id: selectedTenantId, name: "Tenant" },
            requirements: data.requirements ?? null,
          },
        ]);
        setShowAssignForm(false);
        setSelectedTenantId("");
      }
    } finally {
      setAssigning(false);
    }
  }

  async function runGap(tenantId: string) {
    setGapLoadingId(tenantId);
    try {
      const res = await fetch(`/api/sites/${site.id}/gap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      const data = await res.json();
      if (res.ok) {
        setGapResults((prev) => ({ ...prev, [tenantId]: data }));
      }
    } finally {
      setGapLoadingId(null);
    }
  }

  const assignedTenantIds = new Set(assignments.map((a) => a.tenantId));
  const unassignedTenants = availableTenants.filter(
    (t) => !assignedTenantIds.has(t.id)
  );

  async function deleteSite() {
    if (!confirm("Delete this site? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/sites/${site.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/sites");
      router.refresh();
    } else {
      alert("Delete failed. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">
              {site.name ?? site.address ?? "Untitled site"}
            </h1>
            <p className="text-sm text-gray-500">
              {[site.address, site.city, site.state, site.zip]
                .filter(Boolean)
                .join(", ")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {site.siteType && (
                <StatusPill status="info">
                  {labelFor(SITE_TYPES, site.siteType)}
                </StatusPill>
              )}
              {site.quadrant && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {site.quadrant}
                </span>
              )}
              {site.availableDate && (
                <span className="text-xs text-gray-400">
                  Available{" "}
                  {new Date(site.availableDate).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/sites/${site.id}/export`} className="btn-secondary">
              <FileDown className="h-4 w-4" /> Export
            </Link>
            <Link href={`/sites/${site.id}/edit`} className="btn-secondary">
              <Pencil className="h-4 w-4" /> Edit
            </Link>
            <button
              onClick={deleteSite}
              disabled={deleting}
              className="btn-secondary text-red-600 hover:border-red-300 hover:bg-red-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.id
                ? "border-brand text-brand"
                : "border-transparent text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Property details */}
          <div className="card">
            <h3 className="mb-3 font-semibold text-gray-900">Property</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Metric label="Name" value={site.name} />
              <Metric label="Address" value={site.address} />
              <Metric
                label="City / State / ZIP"
                value={
                  [site.city, site.state, site.zip].filter(Boolean).join(", ") ||
                  null
                }
              />
              <Metric label="Quadrant" value={site.quadrant} />
              <Metric
                label="Site Type"
                value={labelFor(SITE_TYPES, site.siteType)}
              />
              <Metric
                label="Available Date"
                value={
                  site.availableDate
                    ? new Date(site.availableDate).toLocaleDateString()
                    : null
                }
              />
            </div>
          </div>

          {/* Physical */}
          <div className="card">
            <h3 className="mb-3 font-semibold text-gray-900">Physical</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Metric
                label="Square Feet"
                value={site.squareFeet?.toLocaleString()}
              />
              <Metric
                label="Parking Spaces"
                value={site.parkingSpaces?.toLocaleString()}
              />
              <Metric
                label="Parking Ratio"
                value={
                  site.parkingRatio != null
                    ? `${site.parkingRatio.toFixed(1)}/1,000 SF`
                    : null
                }
              />
            </div>
          </div>

          {/* Financial */}
          <div className="card">
            <h3 className="mb-3 font-semibold text-gray-900">Financial</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              {/* PSF rates */}
              <Metric label="Base Rent PSF/mo" value={site.askingRentPerSF != null ? `$${(site.askingRentPerSF / 12).toFixed(2)}` : null} />
              <Metric label="NNN PSF/mo" value={site.nnnEstimate != null ? `$${(site.nnnEstimate / 12).toFixed(2)}` : null} />
              <Metric
                label="Total PSF/mo"
                value={site.askingRentPerSF != null || site.nnnEstimate != null
                  ? `$${((site.askingRentPerSF ?? 0) / 12 + (site.nnnEstimate ?? 0) / 12).toFixed(2)}`
                  : null}
              />

              {/* Monthly payments (PSF × SF / 12) — only when SF is known */}
              {site.squareFeet != null && site.askingRentPerSF != null && (
                <Metric
                  label="Monthly Base Rent"
                  value={`$${((site.askingRentPerSF / 12) * site.squareFeet).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                  hint={`${(site.askingRentPerSF / 12).toFixed(2)} PSF/mo × ${site.squareFeet.toLocaleString()} SF`}
                />
              )}
              {site.squareFeet != null && (site.askingRentPerSF != null || site.nnnEstimate != null) && (
                <Metric
                  label="Monthly Total Rent"
                  value={`$${(((site.askingRentPerSF ?? 0) + (site.nnnEstimate ?? 0)) / 12 * site.squareFeet).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                  hint={`${((site.askingRentPerSF ?? 0) / 12 + (site.nnnEstimate ?? 0) / 12).toFixed(2)} PSF/mo × ${site.squareFeet.toLocaleString()} SF`}
                  highlight
                />
              )}

              {/* Annual reference */}
              <Metric label="Base Rent PSF/yr" value={site.askingRentPerSF != null ? `$${site.askingRentPerSF.toFixed(2)}` : null} />
              <Metric label="NNN PSF/yr" value={site.nnnEstimate != null ? `$${site.nnnEstimate.toFixed(2)}` : null} />
              <Metric label="Lease Type" value={labelFor(TENANT_LEASE_TYPES, site.leaseType)} />
              <Metric label="Lease Term Offered" value={site.leaseTermOffered != null ? `${site.leaseTermOffered} yrs` : null} />
            </div>
          </div>

          {/* Demographics */}
          <div className="card">
            <h3 className="mb-3 font-semibold text-gray-900">Demographics</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Metric
                label="Daily Traffic"
                value={site.dailyTrafficCount?.toLocaleString()}
              />
              <Metric
                label="Pop. 1 Mile"
                value={site.population1Mile?.toLocaleString()}
              />
              <Metric
                label="Pop. 3 Mile"
                value={site.population3Mile?.toLocaleString()}
              />
              <Metric
                label="Pop. 5 Mile"
                value={site.population5Mile?.toLocaleString()}
              />
              <Metric
                label="Median Income"
                value={
                  site.medianIncome != null
                    ? `$${site.medianIncome.toLocaleString()}`
                    : null
                }
              />
            </div>
          </div>

          {/* Co-tenants + Zoning */}
          {(site.coTenants || site.zoning) && (
            <div className="card">
              <h3 className="mb-3 font-semibold text-gray-900">
                Co-Tenants &amp; Zoning
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Metric label="Co-Tenants" value={site.coTenants} />
                <Metric label="Zoning" value={site.zoning} />
              </div>
            </div>
          )}

          {/* Broker */}
          {(site.brokerName || site.brokerEmail || site.brokerPhone) && (
            <div className="card">
              <h3 className="mb-3 font-semibold text-gray-900">Broker</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                <Metric label="Name" value={site.brokerName} />
                <Metric
                  label={site.brokerEmail?.includes(",") ? "Emails" : "Email"}
                  value={
                    site.brokerEmail ? (
                      <span className="flex flex-col gap-0.5">
                        {site.brokerEmail.split(",").map((e) => e.trim()).filter(Boolean).map((email) => (
                          <a key={email} href={`mailto:${email}`} className="text-brand underline break-all">
                            {email}
                          </a>
                        ))}
                      </span>
                    ) : null
                  }
                />
                <Metric label="Phone" value={site.brokerPhone} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scoring tab */}
      {tab === "scoring" && (
        <div className="space-y-3">
          {assignments.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              No tenant assignments yet.
            </p>
          ) : (
            assignments.map((a) => {
              const gap = gapResults[a.tenantId] ?? null;
              const isGapLoading = gapLoadingId === a.tenantId;
              return (
                <div key={a.tenantId} className="card space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-gray-900">
                      {a.tenant.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {a.grade && <GradeBadge grade={a.grade} size="sm" />}
                      {a.score != null && (
                        <span className="text-sm font-bold text-gray-700">
                          {a.score.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>

                  {a.scoreBreakdown && a.scoreBreakdown.length > 0 && (
                    <div className="overflow-hidden rounded border border-gray-200">
                      <table className="w-full text-xs">
                        <tbody>
                          {a.scoreBreakdown.map((row, i) => {
                            const pillClass =
                              row.status === "pass"
                                ? "bg-green-100 text-green-800"
                                : row.status === "warn"
                                ? "bg-yellow-100 text-yellow-800"
                                : row.status === "fail"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-600";
                            return (
                              <tr
                                key={i}
                                className="border-b border-gray-100 last:border-0"
                              >
                                <td className="px-2 py-1 whitespace-nowrap">
                                  <span
                                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none ${pillClass}`}
                                  >
                                    {row.status}
                                  </span>
                                </td>
                                <td className="px-2 py-1 font-medium text-gray-800 whitespace-nowrap">
                                  {row.category}
                                </td>
                                <td className="px-2 py-1 text-gray-500 whitespace-nowrap">
                                  {row.points}/{row.max}
                                </td>
                                <td className="px-2 py-1 text-gray-500">
                                  {row.detail}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!gap && (
                    <button
                      onClick={() => runGap(a.tenantId)}
                      disabled={isGapLoading}
                      className="btn-secondary text-sm"
                    >
                      {isGapLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Lightbulb className="h-4 w-4" />
                      )}
                      {isGapLoading ? "Running…" : "Run Gap Analysis"}
                    </button>
                  )}

                  {gap && (
                    <GapAnalysisBlock
                      analysis={gap}
                      onRefresh={() => runGap(a.tenantId)}
                      loading={isGapLoading}
                    />
                  )}
                </div>
              );
            })
          )}

          {/* Assign form */}
          {showAssignForm ? (
            <div className="card space-y-3">
              <h3 className="font-semibold text-gray-900">Assign to Tenant</h3>
              <select
                className="input"
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
              >
                <option value="">Select a tenant…</option>
                {unassignedTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={assignTenant}
                  disabled={assigning || !selectedTenantId}
                  className="btn-primary"
                >
                  {assigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Assign
                </button>
                <button
                  onClick={() => {
                    setShowAssignForm(false);
                    setSelectedTenantId("");
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            unassignedTenants.length > 0 && (
              <button
                onClick={() => setShowAssignForm(true)}
                className="btn-secondary w-full"
              >
                + Assign to Tenant
              </button>
            )
          )}
        </div>
      )}

      {/* News tab */}
      {tab === "news" && (
        <div className="space-y-2">
          {site.newsFlags.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              No news flags for this site.
            </p>
          ) : (
            site.newsFlags.map((f) => (
              <div key={f.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900">
                    {f.newsItem.headline}
                  </p>
                  {f.impact && (
                    <StatusPill status={ImpactStatus(f.impact)}>
                      {f.impact}
                    </StatusPill>
                  )}
                </div>
                {f.relevance && (
                  <p className="mt-1 text-sm text-gray-600">{f.relevance}</p>
                )}
                {f.newsItem.publishedAt && (
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(f.newsItem.publishedAt).toLocaleDateString()}
                    {f.newsItem.source ? ` · ${f.newsItem.source}` : ""}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
