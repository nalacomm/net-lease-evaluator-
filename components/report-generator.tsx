"use client";

import { useState } from "react";
import { GradeBadge } from "@/components/ui";
import { labelFor, ASSET_TYPES, LEASE_TYPES, GUARANTY_TYPES } from "@/lib/constants";
import { fmtMoney, fmtPercent, fmtDscr } from "@/lib/format";
import { Loader2, FileText, CheckSquare, Square } from "lucide-react";
import clsx from "clsx";

type DealOption = {
  id: string;
  address: string | null;
  tenantName: string | null;
  grade: string | null;
  score: number | null;
  assetType: string | null;
};

type PastReport = {
  id: string;
  title: string | null;
  generatedAt: string;
  dealCount: number;
};

type FinanceSnap = {
  loanAmount: number;
  equityRequired: number;
  monthlyDebtService: number;
  monthlyNetCashFlow: number;
  dscr: number | null;
  cashOnCash: number;
  newPortfolioMonthlyTotal: number;
};

type ReportDeal = {
  id: string;
  address: string | null;
  tenantName: string | null;
  assetType: string | null;
  askingPrice: number | null;
  noi: number | null;
  capRateAsking: number | null;
  leaseType: string | null;
  termRemainingYears: number | null;
  guarantyType: string | null;
  grade: string | null;
  score: number | null;
  scoreBreakdown: unknown;
  selfCheckerNotes: string | null;
  finance: FinanceSnap;
  strengths: string[];
  risks: string[];
};

type ReportData = {
  reportId: string;
  investor: { name: string; entityName: string | null };
  execSummary: string;
  recommendation: string;
  deals: ReportDeal[];
};

export function ReportGenerator({
  allInvestors = [],
  activeInvestorId,
  investor,
  deals,
  pastReports,
}: {
  allInvestors?: { id: string; name: string }[];
  activeInvestorId?: string | null;
  investor: { id: string; name: string } | null;
  deals: DealOption[];
  pastReports: PastReport[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);

  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < 3 ? [...s, id] : s
    );
  }

  async function generate() {
    if (!investor || selected.length === 0) return;
    setGenerating(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorId: investor.id, dealIds: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setGenerating(false);
    }
  }

  function printReport() {
    window.print();
  }

  return (
    <div className="space-y-5">
      {/* Investor selector */}
      {allInvestors.length > 1 && (
        <div className="card flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Generate report for:</label>
          <div className="flex flex-wrap gap-2">
            {allInvestors.map((inv) => (
              <a
                key={inv.id}
                href={`/reports?investorId=${inv.id}`}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  activeInvestorId === inv.id
                    ? "border-brand bg-brand text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {inv.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {!investor && (
        <p className="text-sm text-gray-400">Select an investor above to generate a report.</p>
      )}

      {investor && (
      <>
      {/* Deal picker */}
      <div className="card">
        <h2 className="mb-1 font-semibold">Select up to 3 deals</h2>
        <p className="mb-3 text-sm text-gray-500">Active deals ranked by score. {selected.length}/3 selected.</p>
        {deals.length === 0 ? (
          <p className="text-sm text-gray-400">No active deals for this investor.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {deals.map((d) => {
              const isSelected = selected.includes(d.id);
              const disabled = !isSelected && selected.length >= 3;
              return (
                <li key={d.id}>
                  <button
                    onClick={() => !disabled && toggle(d.id)}
                    disabled={disabled}
                    className={clsx(
                      "flex min-h-touch w-full items-center gap-3 py-2 text-left",
                      disabled && "opacity-40"
                    )}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-brand" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                    <GradeBadge grade={d.grade} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-gray-900">{d.address ?? "—"}</p>
                      <p className="truncate text-xs text-gray-500">
                        {d.tenantName ?? "—"} · {labelFor(ASSET_TYPES, d.assetType)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-gray-600">{d.score?.toFixed(0) ?? "—"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        onClick={generate}
        disabled={generating || selected.length === 0}
        className="btn-primary w-full"
      >
        {generating ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Generating report…</>
        ) : (
          <><FileText className="h-4 w-4" /> Generate Report</>
        )}
      </button>

      {/* Generated report */}
      {report && (
        <div className="space-y-4 print:block" id="report-output">
          <div className="card print:shadow-none">
            <div className="mb-4 border-b border-gray-200 pb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Blake-Dickson Commercial Real Estate</p>
              <h2 className="mt-1 text-xl font-bold text-brand">Net Lease Investment Report</h2>
              <p className="text-sm text-gray-600">{report.investor.name}{report.investor.entityName ? ` · ${report.investor.entityName}` : ""}</p>
              <p className="text-xs text-gray-400">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
            <h3 className="mb-1 font-semibold">Executive Summary</h3>
            <p className="text-sm text-gray-700">{report.execSummary}</p>
          </div>

          {report.deals.map((d) => (
            <div key={d.id} className="card print:shadow-none print:break-inside-avoid">
              <div className="mb-3 flex items-center gap-3">
                <GradeBadge grade={d.grade} size="lg" />
                <div>
                  <h3 className="font-bold text-gray-900">{d.address ?? "—"}</h3>
                  <p className="text-sm text-gray-500">{d.tenantName} · {labelFor(ASSET_TYPES, d.assetType)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">Price</span><span className="font-medium">{fmtMoney(d.askingPrice)}</span>
                <span className="text-gray-500">NOI</span><span className="font-medium">{fmtMoney(d.noi)}</span>
                <span className="text-gray-500">Cap Rate</span><span className="font-medium">{fmtPercent(d.capRateAsking)}</span>
                <span className="text-gray-500">Lease</span><span className="font-medium">{labelFor(LEASE_TYPES, d.leaseType)}</span>
                <span className="text-gray-500">Term</span><span className="font-medium">{d.termRemainingYears ?? "—"} yrs</span>
                <span className="text-gray-500">Guaranty</span><span className="font-medium">{labelFor(GUARANTY_TYPES, d.guarantyType)}</span>
                <span className="text-gray-500">DSCR</span><span className="font-medium">{fmtDscr(d.finance.dscr)}</span>
                <span className="text-gray-500">Mo. Cash Flow</span><span className="font-medium">{fmtMoney(d.finance.monthlyNetCashFlow)}</span>
                <span className="text-gray-500">New Portfolio Total</span><span className="font-medium">{fmtMoney(d.finance.newPortfolioMonthlyTotal)}/mo</span>
              </div>
              {d.selfCheckerNotes && (
                <p className="mt-2 text-xs text-gray-400">{d.selfCheckerNotes}</p>
              )}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-green-700">Strengths</p>
                  <ul className="mt-1 space-y-1 text-sm text-gray-700">
                    {d.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-red-700">Risks</p>
                  <ul className="mt-1 space-y-1 text-sm text-gray-700">
                    {d.risks.map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          ))}

          <div className="card print:shadow-none">
            <h3 className="mb-1 font-semibold">Recommendation</h3>
            <p className="text-sm text-gray-700">{report.recommendation}</p>
          </div>

          <button onClick={printReport} className="btn-secondary w-full print:hidden">
            <FileText className="h-4 w-4" /> Print / Save as PDF
          </button>
        </div>
      )}

      {/* Past reports */}
      {pastReports.length > 0 && (
        <div className="card">
          <h2 className="mb-2 font-semibold text-gray-700">Past Reports</h2>
          <ul className="divide-y divide-gray-100">
            {pastReports.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-gray-900">{r.title ?? "Report"}</span>
                <span className="text-gray-400">{new Date(r.generatedAt).toLocaleDateString()} · {r.dealCount} deals</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      </>
      )}
    </div>
  );
}
