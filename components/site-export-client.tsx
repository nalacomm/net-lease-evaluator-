"use client";

import { Printer, Lightbulb } from "lucide-react";
import { PrintFooter } from "@/components/print-footer";
import clsx from "clsx";

const GRADE_BG: Record<string, string> = {
  A: "bg-green-600", B: "bg-blue-600",
  C: "bg-yellow-500", D: "bg-orange-500", F: "bg-red-600",
};

const STATUS_STYLE: Record<string, string> = {
  pass: "bg-green-100 text-green-800",
  warn: "bg-yellow-100 text-yellow-800",
  fail: "bg-red-100 text-red-800",
  info: "bg-gray-100 text-gray-600",
};

type GapAdjustment = { field: string; currentValue: string; requiredValue: string; impact: string };

type Assignment = {
  id: string;
  tenantName: string;
  score: number | null;
  grade: string | null;
  scoreBreakdown: { category: string; points: number; max: number; status: string; detail: string }[] | null;
  gapAnalysis: {
    isExceptional: boolean;
    exceptionalReason: string | null;
    buyBoxAdjustments?: GapAdjustment[];
    requirementAdjustments?: GapAdjustment[];
    verdict: string;
  } | null;
  requirements: {
    minSF: number | null;
    maxSF: number | null;
    maxRentPsf: number | null;
    minTraffic: number | null;
    targetMarkets: string[];
    siteTypePrefs: string[];
  } | null;
};

type ExportData = {
  site: {
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    quadrant: string | null;
    siteType: string;
    status: string | null;
    squareFeet: string | null;
    parkingSpaces: string | null;
    parkingRatio: string | null;
    askingRentPsf: string | null;
    nnnEstimate: string | null;
    leaseType: string;
    leaseTermOffered: string | null;
    availableDate: string | null;
    dailyTraffic: string | null;
    population1mi: string | null;
    population3mi: string | null;
    population5mi: string | null;
    medianIncome: string | null;
    coTenants: string | null;
    zoning: string | null;
    brokerName: string | null;
    brokerEmail: string | null;
    brokerPhone: string | null;
    notes: string | null;
    source: string | null;
  };
  assignments: Assignment[];
  newsFlags: {
    id: string;
    relevance: string | null;
    impact: string | null;
    headline: string;
    source: string | null;
    publishedAt: string | null;
  }[];
  date: string;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 break-inside-avoid">
      <h3 className="mb-3 font-semibold text-gray-900 border-b border-gray-100 pb-1">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === "—") return null;
  return (
    <div className="flex justify-between gap-4 border-b border-gray-50 py-1.5 text-sm last:border-0">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

export function SiteExportClient({ data }: { data: ExportData }) {
  const { site, assignments, newsFlags, date } = data;

  const locationParts = [
    site.address,
    [site.city, site.state].filter(Boolean).join(", "),
    site.zip,
    site.quadrant,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-white p-6 print:p-0">
      {/* Print button — hidden when printing */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <button onClick={() => window.print()} className="btn-primary gap-2">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
        <button onClick={() => window.history.back()} className="btn-secondary">
          ← Back
        </button>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 print:max-w-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
              Blake-Dickson Commercial Real Estate · Tenant Rep
            </p>
            <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
            {locationParts.length > 0 && (
              <p className="text-gray-500 mt-0.5">{locationParts.join(" · ")}</p>
            )}
            <div className="mt-1 flex flex-wrap gap-1">
              {site.siteType && site.siteType !== "—" && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{site.siteType}</span>
              )}
              {site.status && (
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand capitalize">
                  {site.status.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 shrink-0 print:text-gray-500">{date}</p>
        </div>

        {/* Site Details */}
        <Section title="Site Details">
          <div className="grid grid-cols-2 gap-x-8">
            <div>
              <Row label="Square Feet" value={site.squareFeet ? `${site.squareFeet} SF` : null} />
              <Row label="Parking Spaces" value={site.parkingSpaces} />
              <Row label="Parking Ratio" value={site.parkingRatio} />
              <Row label="Zoning" value={site.zoning} />
              <Row label="Available" value={site.availableDate} />
            </div>
            <div>
              <Row label="Asking Rent" value={site.askingRentPsf} />
              <Row label="NNN Est." value={site.nnnEstimate} />
              <Row label="Lease Type" value={site.leaseType !== "—" ? site.leaseType : null} />
              <Row label="Lease Term" value={site.leaseTermOffered} />
              <Row label="Co-Tenants" value={site.coTenants} />
            </div>
          </div>
        </Section>

        {/* Demographics */}
        {(site.dailyTraffic || site.population1mi || site.medianIncome) && (
          <Section title="Demographics & Traffic">
            <div className="grid grid-cols-2 gap-x-8">
              <div>
                <Row label="Daily Traffic" value={site.dailyTraffic} />
                <Row label="Median Income" value={site.medianIncome} />
              </div>
              <div>
                <Row label="Population (1 mi)" value={site.population1mi} />
                <Row label="Population (3 mi)" value={site.population3mi} />
                <Row label="Population (5 mi)" value={site.population5mi} />
              </div>
            </div>
          </Section>
        )}

        {/* Notes */}
        {site.notes && (
          <Section title="Notes">
            <p className="text-sm text-gray-700 whitespace-pre-line">{site.notes}</p>
          </Section>
        )}

        {/* Broker */}
        {(site.brokerName || site.brokerEmail || site.brokerPhone) && (
          <Section title="Broker / Source">
            <Row label="Name" value={site.brokerName} />
            <Row label="Email" value={site.brokerEmail} />
            <Row label="Phone" value={site.brokerPhone} />
            <Row label="Source" value={site.source} />
          </Section>
        )}

        {/* Tenant Scoring */}
        {assignments.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 text-lg border-b border-gray-200 pb-1">
              Tenant Scoring ({assignments.length})
            </h2>

            {assignments.map((a) => {
              const adjustments = a.gapAnalysis?.buyBoxAdjustments ?? a.gapAnalysis?.requirementAdjustments ?? [];

              return (
                <div key={a.id} className="rounded-lg border border-gray-200 p-4 space-y-4 break-inside-avoid">
                  {/* Tenant header */}
                  <div className="flex items-center gap-3">
                    {a.grade && (
                      <span className={clsx("inline-flex h-9 w-9 items-center justify-center rounded font-bold text-white", GRADE_BG[a.grade] ?? "bg-gray-400")}>
                        {a.grade}
                      </span>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{a.tenantName}</p>
                      {a.score != null && (
                        <p className="text-sm text-gray-500">Score: {a.score.toFixed(0)}/100</p>
                      )}
                    </div>
                  </div>

                  {/* Tenant requirements summary */}
                  {a.requirements && (
                    <div className="rounded bg-gray-50 px-3 py-2 text-xs text-gray-600 grid grid-cols-2 gap-x-6">
                      {a.requirements.minSF && <span>Min SF: {a.requirements.minSF.toLocaleString()}</span>}
                      {a.requirements.maxSF && <span>Max SF: {a.requirements.maxSF.toLocaleString()}</span>}
                      {a.requirements.maxRentPsf && <span>Max Rent: ${a.requirements.maxRentPsf}/SF</span>}
                      {a.requirements.minTraffic && <span>Min Traffic: {a.requirements.minTraffic.toLocaleString()} VPD</span>}
                      {a.requirements.targetMarkets.length > 0 && (
                        <span className="col-span-2">Markets: {a.requirements.targetMarkets.join(", ")}</span>
                      )}
                    </div>
                  )}

                  {/* Score breakdown */}
                  {a.scoreBreakdown && a.scoreBreakdown.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Score Breakdown</p>
                      <div className="space-y-1">
                        {a.scoreBreakdown.map((row, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm">
                            <span className={clsx("shrink-0 rounded px-1.5 py-0.5 text-xs font-medium", STATUS_STYLE[row.status] ?? STATUS_STYLE.info)}>
                              {row.points}/{row.max}
                            </span>
                            <span className="font-medium text-gray-800 w-32 shrink-0">{row.category}</span>
                            <span className="text-gray-500">{row.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gap analysis */}
                  {a.gapAnalysis && (
                    <div className={clsx("rounded-lg border-2 p-3", a.gapAnalysis.isExceptional ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white")}>
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className={clsx("h-4 w-4", a.gapAnalysis.isExceptional ? "text-amber-600" : "text-gray-400")} />
                        <span className="font-semibold text-sm">
                          {a.gapAnalysis.isExceptional ? "Exceptional Flag" : "Gap Analysis"}
                        </span>
                        {a.gapAnalysis.isExceptional && (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">Worth a look</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{a.gapAnalysis.verdict}</p>
                      {a.gapAnalysis.exceptionalReason && (
                        <p className="text-sm text-amber-800 mb-2 font-medium">{a.gapAnalysis.exceptionalReason}</p>
                      )}
                      {adjustments.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Adjustments needed</p>
                          <ul className="space-y-1">
                            {adjustments.map((adj, i) => (
                              <li key={i} className="flex flex-wrap items-start gap-2 text-sm">
                                <span className="font-medium text-gray-800 w-32 shrink-0">{adj.field}</span>
                                <span className="text-red-600 line-through">{adj.currentValue}</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-green-700 font-medium">{adj.requiredValue}</span>
                                <span className="text-gray-500">{adj.impact}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* News Flags */}
        {newsFlags.length > 0 && (
          <Section title={`News Flags (${newsFlags.length})`}>
            <div className="space-y-2">
              {newsFlags.map((f) => (
                <div key={f.id} className="border-b border-gray-50 pb-2 last:border-0">
                  <p className="text-sm font-medium text-gray-900">{f.headline}</p>
                  <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-gray-500">
                    {f.relevance && <span>{f.relevance}</span>}
                    {f.impact && (
                      <span className={clsx(
                        "rounded px-1.5 py-0.5 font-medium",
                        f.impact === "positive" ? "bg-green-100 text-green-700" :
                        f.impact === "negative" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {f.impact}
                      </span>
                    )}
                    {f.source && <span>{f.source}</span>}
                    {f.publishedAt && <span>{f.publishedAt}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <p className="text-center text-xs text-gray-300 print:hidden pb-4">
          Use your browser&apos;s Print dialog or Cmd+P / Ctrl+P to save as PDF
        </p>

        <PrintFooter date={date} />
      </div>
    </div>
  );
}
