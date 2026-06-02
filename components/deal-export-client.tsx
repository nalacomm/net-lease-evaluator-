"use client";

import { Printer, Lightbulb } from "lucide-react";
import { PrintFooter } from "@/components/print-footer";
import type { GapAnalysisResult } from "@/lib/gap-analysis";
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

type ExportData = {
  deal: {
    address: string | null; city: string | null; state: string | null;
    status: string; assetType: string;
    tenantName: string | null; operatorName: string | null;
    operatorUnitCount: number | null; guaranty: string;
    askingPrice: string; noi: string; capRateAsking: string;
    capRateUnderwritten: string | null; dscrCalculated: string | null;
    leaseType: string; termRemainingYears: number | null;
    leaseCommenceDate: string | null; leaseExpirationDate: string | null;
    bumpStructure: string | null;
    constructionYear: number | null; buildingSize: string | null; lotSize: string | null;
    numberOfTenants: number | null; anchorTenant: string | null;
    vacancyRate: string | null; grossLeasableArea: string | null;
    hhi1Mile: string | null; hhi3Mile: string | null;
    hhi5Mile: string | null; population1Mile: string | null;
    sourceBroker: string | null; sourcePlatform: string; sourceUrl: string | null;
    confidenceLevel: string | null; selfCheckerNotes: string | null;
    scoreRationale: string | null;
  };
  investor: { name: string; entityName: string | null } | null;
  buyBox: {
    ltv: number; interestRate: number; amortizationYears: number; dscrMin: number;
    capRateMin: number; capRateTarget: number; priceMax: number;
    leaseTypePreferred: string; termMinYears: number;
  } | null;
  score: number | null;
  grade: string | null;
  scoreBreakdown: { category: string; points: number; max: number; status: string; detail: string }[] | null;
  fin: {
    equityRequired: string; loanAmount: string; monthlyDebtService: string;
    monthlyNetCashFlow: string; annualNetCashFlow: string;
    dscr: string; cashOnCash: string; capRate: string;
  } | null;
  gapAnalysis: GapAnalysisResult | null;
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

export function DealExportClient({ data }: { data: ExportData }) {
  const { deal, investor, buyBox, score, grade, scoreBreakdown, fin, gapAnalysis, date } = data;
  const isShoppingCenter = deal.assetType === "Shopping Center";

  return (
    <div className="min-h-screen bg-white p-6 print:p-0">
      {/* Screen controls */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <button onClick={() => window.print()} className="btn-primary gap-2">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
        <button onClick={() => window.history.back()} className="btn-secondary">← Back</button>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 print:max-w-full">

        {/* ── Header ── */}
        <div className="border-b-2 border-gray-900 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Blake-Dickson Commercial Real Estate
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Deal Analysis Report</h1>
          {investor && (
            <p className="text-sm text-gray-600 mt-0.5">
              Prepared for: <span className="font-semibold">{investor.name}</span>
              {investor.entityName && ` · ${investor.entityName}`}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">{date}</p>
        </div>

        {/* ── Score strip ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{deal.address ?? "—"}</h2>
            <p className="text-sm text-gray-600">
              {[deal.city, deal.state].filter(Boolean).join(", ")}
              {(deal.city || deal.state) && " · "}
              {deal.tenantName} · {deal.assetType}
            </p>
            <p className="text-xs text-gray-400 mt-1">Status: {deal.status}</p>
            {deal.sourceBroker && (
              <p className="text-xs text-gray-400">
                Source: {deal.sourceBroker}
                {deal.sourcePlatform && deal.sourcePlatform !== "—" ? ` · ${deal.sourcePlatform}` : ""}
              </p>
            )}
            {deal.sourceUrl && (
              <p className="text-xs text-blue-500 break-all">{deal.sourceUrl}</p>
            )}
          </div>
          {grade && (
            <div className="flex flex-col items-center shrink-0">
              <div className={clsx("flex h-16 w-16 items-center justify-center rounded-xl text-3xl font-bold text-white", GRADE_BG[grade] ?? "bg-gray-400")}>
                {grade}
              </div>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {score?.toFixed(0) ?? "—"}
                <span className="text-sm font-normal text-gray-400">/100</span>
              </p>
              {deal.confidenceLevel && (
                <span className={clsx("mt-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                  deal.confidenceLevel === "high" ? "bg-green-100 text-green-800" :
                  deal.confidenceLevel === "medium" ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                )}>
                  {deal.confidenceLevel.toUpperCase()} confidence
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Two-column detail grid ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="Financials">
            <Row label="Asking Price" value={deal.askingPrice} />
            <Row label="NOI" value={deal.noi} />
            <Row label="Cap Rate (asking)" value={deal.capRateAsking} />
            <Row label="Cap Rate (underwritten)" value={deal.capRateUnderwritten} />
            <Row label="DSCR (calculated)" value={deal.dscrCalculated} />
          </Section>

          <Section title="Tenant & Operator">
            <Row label="Tenant" value={deal.tenantName} />
            <Row label="Operator" value={deal.operatorName} />
            <Row label="Operator Units" value={deal.operatorUnitCount} />
            <Row label="Guaranty" value={deal.guaranty} />
          </Section>

          <Section title="Lease">
            <Row label="Lease Type" value={deal.leaseType} />
            <Row label="Term Remaining" value={deal.termRemainingYears ? `${deal.termRemainingYears} yrs` : null} />
            <Row label="Lease Start" value={deal.leaseCommenceDate} />
            <Row label="Lease Expiration" value={deal.leaseExpirationDate} />
            <Row label="Rent Bumps" value={deal.bumpStructure} />
          </Section>

          <Section title="Property">
            <Row label="Asset Type" value={deal.assetType} />
            <Row label="Year Built" value={deal.constructionYear} />
            <Row label="Building SF" value={deal.buildingSize} />
            <Row label="Lot Size" value={deal.lotSize} />
          </Section>

          {isShoppingCenter && (
            <Section title="Shopping Center">
              <Row label="# Tenants" value={deal.numberOfTenants} />
              <Row label="Anchor Tenant" value={deal.anchorTenant} />
              <Row label="Vacancy Rate" value={deal.vacancyRate} />
              <Row label="Gross Leasable Area" value={deal.grossLeasableArea} />
            </Section>
          )}

          <Section title="Demographics">
            <Row label="HHI 1-Mile" value={deal.hhi1Mile} />
            <Row label="HHI 3-Mile" value={deal.hhi3Mile} />
            <Row label="HHI 5-Mile" value={deal.hhi5Mile} />
            <Row label="Population 1-Mile" value={deal.population1Mile} />
          </Section>
        </div>

        {/* ── Finance snapshot ── */}
        {fin && buyBox && (
          <Section title="Finance Snapshot">
            <p className="mb-3 text-xs text-gray-400">
              {(buyBox.ltv * 100).toFixed(0)}% LTV · {buyBox.interestRate}% rate ·{" "}
              {buyBox.amortizationYears}yr amort · DSCR floor {buyBox.dscrMin.toFixed(2)}x ·
              Cap floor {buyBox.capRateMin}% / target {buyBox.capRateTarget}% ·
              Min term {buyBox.termMinYears} yrs · Preferred: {buyBox.leaseTypePreferred}
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {[
                ["Equity Required", fin.equityRequired],
                ["Loan Amount", fin.loanAmount],
                ["Monthly Debt Service", fin.monthlyDebtService],
                ["Monthly Net Cash Flow", fin.monthlyNetCashFlow],
                ["Annual Net Cash Flow", fin.annualNetCashFlow],
                ["DSCR", fin.dscr],
                ["Cash-on-Cash Return", fin.cashOnCash],
                ["Cap Rate", fin.capRate],
              ].map(([label, value]) => (
                <div key={label} className="py-1">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-semibold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Score breakdown ── */}
        {scoreBreakdown && (
          <Section title="Score Breakdown">
            {deal.scoreRationale && (
              <p className="mb-3 text-sm text-gray-600 italic">{deal.scoreRationale}</p>
            )}
            <div className="space-y-2">
              {scoreBreakdown.map((c) => (
                <div key={c.category} className="flex items-center gap-3 text-sm">
                  <span className={clsx("w-14 rounded-full px-2 py-0.5 text-center text-xs font-semibold shrink-0", STATUS_STYLE[c.status] ?? STATUS_STYLE.info)}>
                    {c.points}/{c.max}
                  </span>
                  <span className="w-44 font-medium text-gray-800 shrink-0">{c.category}</span>
                  <span className="text-gray-500">{c.detail}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Gap analysis ── */}
        {gapAnalysis && (
          <div className={clsx("rounded-lg border-2 p-4 break-inside-avoid",
            gapAnalysis.isExceptional ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-gray-50"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className={clsx("h-5 w-5 shrink-0", gapAnalysis.isExceptional ? "text-amber-600" : "text-gray-400")} />
              <h3 className="font-semibold text-gray-900">
                {gapAnalysis.isExceptional ? "Exceptional Deal Flag" : "Buy Box Gap Analysis"}
              </h3>
              {gapAnalysis.isExceptional && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                  Worth a look
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 mb-3">{gapAnalysis.verdict}</p>
            {gapAnalysis.exceptionalReason && (
              <p className="text-sm text-amber-800 font-medium mb-3">{gapAnalysis.exceptionalReason}</p>
            )}
            {gapAnalysis.buyBoxAdjustments.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Buy box adjustments needed
                </p>
                <div className="space-y-1.5">
                  {gapAnalysis.buyBoxAdjustments.map((a, i) => (
                    <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                      <span className="font-medium text-gray-800 w-40 shrink-0">{a.field}</span>
                      <span className="text-red-600 line-through">{a.currentValue}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-green-700 font-medium">{a.requiredValue}</span>
                      <span className="text-gray-500 text-xs">{a.impact}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Validation notes ── */}
        {deal.selfCheckerNotes && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 break-inside-avoid">
            <h3 className="mb-1 font-semibold text-amber-900">Validation Notes</h3>
            <p className="text-sm text-amber-800">{deal.selfCheckerNotes}</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-300 print:hidden pb-4">
          Net Lease Deal Evaluator · Blake-Dickson CRE
        </p>
      </div>

      <PrintFooter date={date} />
    </div>
  );
}
