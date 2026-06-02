"use client";

import { Printer } from "lucide-react";
import { PrintFooter } from "@/components/print-footer";
import clsx from "clsx";

const GRADE_BG: Record<string, string> = {
  A: "bg-green-600",
  B: "bg-blue-600",
  C: "bg-yellow-500",
  D: "bg-orange-500",
  F: "bg-red-600",
};

const STATUS_STYLE: Record<string, string> = {
  pass: "bg-green-100 text-green-800",
  warn: "bg-yellow-100 text-yellow-800",
  fail: "bg-red-100 text-red-800",
  info: "bg-gray-100 text-gray-600",
};

type ExportData = {
  deal: {
    address: string | null;
    city: string | null;
    state: string | null;
    tenantName: string | null;
    operatorName: string | null;
    assetType: string;
    askingPrice: string;
    noi: string;
    capRate: string;
    leaseType: string;
    termRemainingYears: number | null;
    bumpStructure: string | null;
    guaranty: string;
    operatorUnitCount: number | null;
    constructionYear: number | null;
    buildingSize: number | null;
    hhi3Mile: string | null;
    selfCheckerNotes: string | null;
    sourceBroker: string | null;
  };
  investor: { name: string; entityName: string | null } | null;
  buyBox: { ltv: number; interestRate: number; amortizationYears: number; dscrMin: number } | null;
  score: number | null;
  grade: string | null;
  scoreBreakdown: { category: string; points: number; max: number; status: string; detail: string }[] | null;
  fin: {
    loanAmount: string;
    equityRequired: string;
    monthlyDebtService: string;
    monthlyNetCashFlow: string;
    annualNetCashFlow: string;
    dscr: string;
    cashOnCash: string;
    capRate: string;
  } | null;
  date: string;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-1.5 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value ?? "—"}</span>
    </div>
  );
}

export function DealExportClient({ data }: { data: ExportData }) {
  const { deal, investor, buyBox, score, grade, scoreBreakdown, fin, date } = data;

  return (
    <div className="min-h-screen bg-white p-6 print:p-0">
      {/* Print button — screen only */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <button onClick={() => window.print()} className="btn-primary gap-2">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
        <button onClick={() => window.history.back()} className="btn-secondary">← Back</button>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 print:max-w-full">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Blake-Dickson Commercial Real Estate
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Deal Analysis Report
          </h1>
          {investor && (
            <p className="text-sm text-gray-600">
              Prepared for: <span className="font-semibold">{investor.name}</span>
              {investor.entityName && ` · ${investor.entityName}`}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">{date}</p>
        </div>

        {/* Deal summary + score */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{deal.address ?? "—"}</h2>
            <p className="text-sm text-gray-600">
              {[deal.city, deal.state].filter(Boolean).join(", ")}
              {deal.city && " · "}
              {deal.tenantName} · {deal.assetType}
            </p>
            {deal.sourceBroker && (
              <p className="text-xs text-gray-400 mt-1">Source: {deal.sourceBroker}</p>
            )}
          </div>
          {grade && (
            <div className="flex flex-col items-center">
              <div className={clsx("flex h-14 w-14 items-center justify-center rounded-xl text-3xl font-bold text-white", GRADE_BG[grade] ?? "bg-gray-400")}>
                {grade}
              </div>
              <p className="mt-1 text-lg font-bold text-gray-900">{score?.toFixed(0) ?? "—"}<span className="text-sm font-normal text-gray-400">/100</span></p>
            </div>
          )}
        </div>

        {/* Deal details */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="mb-2 font-semibold text-gray-900">Property & Financials</h3>
            <Row label="Asking Price" value={deal.askingPrice} />
            <Row label="NOI" value={deal.noi} />
            <Row label="Cap Rate" value={deal.capRate} />
            <Row label="Asset Type" value={deal.assetType} />
            <Row label="Year Built" value={deal.constructionYear} />
            <Row label="Building SF" value={deal.buildingSize?.toLocaleString()} />
            <Row label="HHI 3-Mile" value={deal.hhi3Mile} />
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="mb-2 font-semibold text-gray-900">Lease & Tenant</h3>
            <Row label="Tenant" value={deal.tenantName} />
            <Row label="Operator" value={deal.operatorName} />
            <Row label="Operator Units" value={deal.operatorUnitCount} />
            <Row label="Guaranty" value={deal.guaranty} />
            <Row label="Lease Type" value={deal.leaseType} />
            <Row label="Term Remaining" value={deal.termRemainingYears ? `${deal.termRemainingYears} yrs` : null} />
            <Row label="Rent Bumps" value={deal.bumpStructure} />
          </div>
        </div>

        {/* Finance snapshot */}
        {fin && buyBox && (
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="mb-1 font-semibold text-gray-900">Finance Snapshot</h3>
            <p className="mb-3 text-xs text-gray-400">
              At {(buyBox.ltv * 100).toFixed(0)}% LTV · {buyBox.interestRate}% rate · {buyBox.amortizationYears}yr amort · DSCR floor {buyBox.dscrMin.toFixed(2)}x
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
              {[
                ["Equity Required", fin.equityRequired],
                ["Loan Amount", fin.loanAmount],
                ["Monthly Debt Service", fin.monthlyDebtService],
                ["Monthly Net Cash Flow", fin.monthlyNetCashFlow],
                ["Annual Net Cash Flow", fin.annualNetCashFlow],
                ["DSCR", fin.dscr],
                ["Cash-on-Cash", fin.cashOnCash],
                ["Cap Rate", fin.capRate],
              ].map(([label, value]) => (
                <div key={label} className="py-1.5">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-semibold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score breakdown */}
        {scoreBreakdown && (
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="mb-3 font-semibold text-gray-900">Score Breakdown</h3>
            <div className="space-y-2">
              {scoreBreakdown.map((c) => (
                <div key={c.category} className="flex items-center gap-3 text-sm">
                  <span className={clsx("w-14 rounded-full px-2 py-0.5 text-center text-xs font-semibold", STATUS_STYLE[c.status] ?? STATUS_STYLE.info)}>
                    {c.points}/{c.max}
                  </span>
                  <span className="w-40 font-medium text-gray-800">{c.category}</span>
                  <span className="text-gray-500">{c.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Self-checker notes */}
        {deal.selfCheckerNotes && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="mb-1 font-semibold text-amber-900">Validation Notes</h3>
            <p className="text-sm text-amber-800">{deal.selfCheckerNotes}</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-300 print:hidden">
          Generated by Net Lease Deal Evaluator · Blake-Dickson CRE
        </p>
      </div>
      <PrintFooter date={data.date} />
    </div>
  );
}
