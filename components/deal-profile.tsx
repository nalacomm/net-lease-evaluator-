"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fmtMoney,
  fmtPercent,
  fmtDscr,
} from "@/lib/format";
import { computeFinance } from "@/lib/finance";
import clsx from "clsx";
import {
  labelFor,
  ASSET_TYPES,
  LEASE_TYPES,
  GUARANTY_TYPES,
  DEAL_STATUSES,
  SOURCE_PLATFORMS,
} from "@/lib/constants";
import { GradeBadge, StatusPill } from "@/components/ui";
import {
  RefreshCw,
  Pencil,
  Calculator,
  Loader2,
  ChevronDown,
  FileDown,
  Trash2,
  Lightbulb,
} from "lucide-react";

type Category = {
  category: string;
  points: number;
  max: number;
  status: string;
  detail: string;
};

type Assignment = {
  investorId: string;
  investorName: string;
  score: number | null;
  grade: string | null;
};

type Deal = {
  id: string;
  address: string | null;
  city: string | null;
  state: string | null;
  assetType: string | null;
  tenantName: string | null;
  operatorName: string | null;
  operatorUnitCount: number | null;
  guarantyType: string | null;
  askingPrice: number | null;
  noi: number | null;
  capRateAsking: number | null;
  capRateUnderwritten: number | null;
  leaseType: string | null;
  termRemainingYears: number | null;
  bumpStructure: string | null;
  bumpPercent: number | null;
  constructionYear: number | null;
  buildingSize: number | null;
  numberOfTenants: number | null;
  anchorTenant: string | null;
  vacancyRate: number | null;
  grossLeasableArea: number | null;
  hhi3Mile: number | null;
  population1Mile: number | null;
  dscrCalculated: number | null;
  loanAmount: number | null;
  monthlyDebtService: number | null;
  monthlyNetCashFlow: number | null;
  score: number | null;
  grade: string | null;
  scoreRationale: string | null;
  scoreBreakdown: Category[] | null;
  confidenceLevel: string | null;
  selfCheckerNotes: string | null;
  sourceBroker: string | null;
  sourcePlatform: string | null;
  status: string;
  assignments: Assignment[];
  updates: {
    id: string;
    content: string;
    sourceType: string;
    aiAnalysis: string | null;
    fieldsUpdated: string[];
    previousScore: number | null;
    newScore: number | null;
    createdAt: string;
  }[];
  newsFlags: {
    id: string;
    relevance: string | null;
    impact: string | null;
    newsItem: { headline: string; source: string | null; publishedAt: string | null };
  }[];
};

const STATUS_MAP: Record<string, string> = {
  pass: "pass",
  warn: "warn",
  fail: "fail",
  info: "info",
};

type InvestorContext = {
  investorId: string;
  investorName: string;
  dscrMin: number;
  ltv: number;
  interestRate: number;
  amortizationYears: number;
  currentMonthlyIncome: number;
};

export function DealProfile({
  deal,
  allInvestors = [],
  investorContext = null,
}: {
  deal: Deal;
  allInvestors?: { id: string; name: string }[];
  investorContext?: InvestorContext | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "financials" | "updates" | "news">(
    "overview"
  );
  const [busy, setBusy] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [updateText, setUpdateText] = useState("");
  const [updating, setUpdating] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>(deal.assignments ?? []);
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [gapAnalysis, setGapAnalysis] = useState<null | {
    isExceptional: boolean;
    exceptionalReason: string | null;
    buyBoxAdjustments: { field: string; currentValue: string; requiredValue: string; impact: string }[];
    verdict: string;
  }>(null);
  const [gapLoading, setGapLoading] = useState(false);

  async function toggleAssignment(investorId: string) {
    const isAssigned = assignments.some((a) => a.investorId === investorId);
    setAssigning(true);
    try {
      if (isAssigned) {
        await fetch(`/api/deals/${deal.id}/assign`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ investorId }),
        });
        setAssignments((a) => a.filter((x) => x.investorId !== investorId));
      } else {
        const res = await fetch(`/api/deals/${deal.id}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ investorId }),
        });
        const data = await res.json();
        const inv = allInvestors.find((i) => i.id === investorId);
        setAssignments((a) => [
          ...a,
          { investorId, investorName: inv?.name ?? "Investor", score: data.score, grade: data.grade },
        ]);
      }
    } finally {
      setAssigning(false);
    }
  }

  async function reanalyze() {
    setBusy(true);
    await fetch(`/api/deals/${deal.id}/analyze`, { method: "POST" });
    router.refresh();
    setBusy(false);
  }

  async function deleteDeal() {
    if (!confirm("Delete this deal? This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/deals/${deal.id}`, { method: "DELETE" });
    router.push("/deals");
    router.refresh();
  }

  async function runGapAnalysis() {
    setGapLoading(true);
    setGapAnalysis(null);
    try {
      const res = await fetch(`/api/deals/${deal.id}/gap-analysis`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setGapAnalysis(data);
    } finally {
      setGapLoading(false);
    }
  }

  async function submitUpdate() {
    if (updateText.trim().length < 5) return;
    setUpdating(true);
    await fetch(`/api/deals/${deal.id}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: updateText, sourceType: "text" }),
    });
    setUpdateText("");
    router.refresh();
    setUpdating(false);
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "financials", label: "Financials" },
    { id: "updates", label: `Updates (${deal.updates.length})` },
    { id: "news", label: `News (${deal.newsFlags.length})` },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">
              {deal.address ?? "Untitled deal"}
            </h1>
            <p className="text-sm text-gray-500">
              {deal.tenantName ?? "—"} · {labelFor(ASSET_TYPES, deal.assetType)}
              {deal.city ? ` · ${deal.city}, ${deal.state ?? ""}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill status="info">
                {labelFor(DEAL_STATUSES, deal.status)}
              </StatusPill>
              {deal.confidenceLevel && (
                <StatusPill
                  status={
                    deal.confidenceLevel === "high"
                      ? "pass"
                      : deal.confidenceLevel === "medium"
                      ? "warn"
                      : "fail"
                  }
                >
                  {deal.confidenceLevel.toUpperCase()} confidence
                </StatusPill>
              )}
              {deal.sourceBroker && (
                <span className="text-xs text-gray-400">
                  via {deal.sourceBroker}
                  {deal.sourcePlatform
                    ? ` · ${labelFor(SOURCE_PLATFORMS, deal.sourcePlatform)}`
                    : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <GradeBadge grade={deal.grade} size="lg" />
            <span className="mt-1 text-lg font-bold text-gray-900">
              {deal.score?.toFixed(0) ?? "—"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={reanalyze} disabled={busy} className="btn-secondary">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Re-analyze
          </button>
          <Link href={`/deals/${deal.id}/edit`} className="btn-secondary">
            <Pencil className="h-4 w-4" /> Edit
          </Link>
          <Link
            href={`/finance/${deal.id}${investorContext ? `?investorId=${investorContext.investorId}` : ""}`}
            className="btn-secondary"
          >
            <Calculator className="h-4 w-4" /> Finance
          </Link>
          <Link
            href={`/deals/${deal.id}/export${investorContext ? `?investorId=${investorContext.investorId}` : ""}`}
            className="btn-secondary"
          >
            <FileDown className="h-4 w-4" /> Export
          </Link>
          <button
            onClick={runGapAnalysis}
            disabled={gapLoading}
            className="btn-secondary"
            title="Evaluate this deal even if it misses the buy box"
          >
            {gapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
            Gap Analysis
          </button>
          <button
            onClick={deleteDeal}
            disabled={deleting}
            className="btn-secondary text-red-600 hover:border-red-300 hover:bg-red-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
        </div>
      </div>

      {/* Investor context banner */}
      {investorContext && (
        <div className="flex items-center gap-2 rounded-lg border border-brand/20 bg-brand/5 px-4 py-2 text-sm text-brand">
          <span className="font-semibold">Viewing as:</span>
          <span>{investorContext.investorName}</span>
          <span className="ml-auto text-xs text-brand/60">
            Score and financials use {investorContext.investorName}&apos;s buy box
          </span>
        </div>
      )}

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

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="card grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Metric label="Asking Price" value={fmtMoney(deal.askingPrice)} />
            <Metric label="NOI" value={fmtMoney(deal.noi)} />
            <Metric label="Cap Rate" value={fmtPercent(deal.capRateAsking)} />
            <Metric label="Lease" value={labelFor(LEASE_TYPES, deal.leaseType)} />
            <Metric
              label="Term"
              value={deal.termRemainingYears ? `${deal.termRemainingYears} yrs` : "—"}
            />
            <Metric
              label="Bumps"
              value={
                deal.bumpStructure ??
                (deal.bumpPercent ? `${deal.bumpPercent}%` : "—")
              }
            />
            <Metric
              label="Guaranty"
              value={labelFor(GUARANTY_TYPES, deal.guarantyType)}
            />
            <Metric label="DSCR" value={fmtDscr(deal.dscrCalculated)} />
            <Metric
              label="Operator Units"
              value={deal.operatorUnitCount ?? "—"}
            />
          </div>

          {/* Score breakdown */}
          <div className="card">
            <button
              onClick={() => setShowBreakdown((s) => !s)}
              className="flex w-full items-center justify-between"
            >
              <span className="font-semibold">Score Breakdown</span>
              <ChevronDown
                className={`h-5 w-5 transition ${showBreakdown ? "rotate-180" : ""}`}
              />
            </button>
            {showBreakdown && deal.scoreBreakdown && (
              <ul className="mt-3 space-y-2">
                {deal.scoreBreakdown.map((c) => (
                  <li
                    key={c.category}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800">{c.category}</p>
                      <p className="truncate text-xs text-gray-500">{c.detail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={STATUS_MAP[c.status] ?? "info"}>
                        {c.points}/{c.max}
                      </StatusPill>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Self-checker */}
          {deal.selfCheckerNotes && (
            <div className="card bg-amber-50">
              <h3 className="mb-1 font-semibold text-amber-900">
                Self-Checker Notes
              </h3>
              <p className="text-sm text-amber-800">{deal.selfCheckerNotes}</p>
            </div>
          )}

          {/* Gap analysis result */}
          {gapAnalysis && (
            <div className={clsx("card border-2", gapAnalysis.isExceptional ? "border-amber-400 bg-amber-50" : "border-gray-200")}>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className={clsx("h-5 w-5", gapAnalysis.isExceptional ? "text-amber-600" : "text-gray-400")} />
                <h3 className="font-semibold text-gray-900">
                  {gapAnalysis.isExceptional ? "Exceptional Deal Flag" : "Gap Analysis"}
                </h3>
                {gapAnalysis.isExceptional && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                    Worth a look
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 mb-3">{gapAnalysis.verdict}</p>
              {gapAnalysis.exceptionalReason && (
                <p className="text-sm text-amber-800 mb-3 font-medium">{gapAnalysis.exceptionalReason}</p>
              )}
              {gapAnalysis.buyBoxAdjustments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Buy box adjustments needed</p>
                  <ul className="space-y-1">
                    {gapAnalysis.buyBoxAdjustments.map((a, i) => (
                      <li key={i} className="flex flex-wrap items-start gap-2 text-sm">
                        <span className="font-medium text-gray-800 w-36 shrink-0">{a.field}</span>
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
          )}

          {/* Shopping center fields */}
          {deal.assetType === "shopping_center" && (
            <div className="card">
              <h3 className="mb-2 font-semibold">Shopping Center Details</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                <Metric label="# Tenants" value={deal.numberOfTenants ?? "—"} />
                <Metric label="Anchor Tenant" value={deal.anchorTenant ?? "—"} />
                <Metric label="Vacancy Rate" value={deal.vacancyRate != null ? `${deal.vacancyRate}%` : "—"} />
                <Metric label="GLA (SF)" value={deal.grossLeasableArea?.toLocaleString() ?? "—"} />
              </div>
            </div>
          )}

          {/* Investor assignments */}
          {allInvestors.length > 0 && (
            <div className="card">
              <h3 className="mb-2 font-semibold">Evaluate Against Investors</h3>
              <p className="mb-3 text-xs text-gray-500">Check which investors to score this deal against. Each uses their own buy box.</p>
              <ul className="divide-y divide-gray-100">
                {allInvestors.map((inv) => {
                  const existing = assignments.find((a) => a.investorId === inv.id);
                  const isAssigned = !!existing;
                  return (
                    <li key={inv.id} className="flex min-h-[44px] items-center justify-between gap-3 py-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`assign-${inv.id}`}
                          checked={isAssigned}
                          onChange={() => toggleAssignment(inv.id)}
                          disabled={assigning}
                          className="h-5 w-5 rounded border-gray-300 accent-brand"
                        />
                        <label htmlFor={`assign-${inv.id}`} className="text-sm font-medium text-gray-900 cursor-pointer">
                          {inv.name}
                        </label>
                      </div>
                      {existing && (
                        <div className="flex items-center gap-2">
                          <GradeBadge grade={existing.grade} size="sm" />
                          <span className="text-sm font-semibold text-gray-600">{existing.score?.toFixed(0)}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "financials" && (
        <div className="space-y-4">
          {investorContext && (
            <div className="rounded-lg border border-brand/20 bg-brand/5 px-4 py-2 text-xs text-brand">
              Figures below are computed using <span className="font-semibold">{investorContext.investorName}</span>&apos;s buy box: {(investorContext.ltv * 100).toFixed(0)}% LTV · {investorContext.interestRate}% rate · {investorContext.amortizationYears}yr amort
            </div>
          )}
          <FinancialsSnapshot deal={deal} investorContext={investorContext} />
          <p className="text-sm text-gray-500">
            Use the{" "}
            <Link
              href={`/finance/${deal.id}${investorContext ? `?investorId=${investorContext.investorId}` : ""}`}
              className="text-brand underline"
            >
              Finance Module
            </Link>{" "}
            to model other LTVs and rates.
          </p>
        </div>
      )}

      {tab === "updates" && (
        <div className="space-y-4">
          <div className="card">
            <label className="label">Add Update</label>
            <textarea
              className="input min-h-[100px]"
              placeholder="Paste new info (price change, lease detail, tenant news)…"
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
            />
            <button
              onClick={submitUpdate}
              disabled={updating}
              className="btn-primary mt-2"
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                </>
              ) : (
                "Add Update & Re-score"
              )}
            </button>
          </div>

          {deal.updates.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              No updates yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {deal.updates.map((u) => (
                <li key={u.id} className="card">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(u.createdAt).toLocaleString()}</span>
                    {u.previousScore != null && u.newScore != null && (
                      <span className="font-medium">
                        {u.previousScore.toFixed(0)} → {u.newScore.toFixed(0)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-800">{u.content}</p>
                  {u.aiAnalysis && (
                    <p className="mt-1 text-xs text-gray-500">{u.aiAnalysis}</p>
                  )}
                  {u.fieldsUpdated.length > 0 && (
                    <p className="mt-1 text-xs text-brand">
                      Updated: {u.fieldsUpdated.join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "news" && (
        <div className="space-y-2">
          {deal.newsFlags.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              No news flags for this deal.
            </p>
          ) : (
            deal.newsFlags.map((f) => (
              <div key={f.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900">
                    {f.newsItem.headline}
                  </p>
                  {f.impact && (
                    <StatusPill
                      status={
                        f.impact === "positive"
                          ? "pass"
                          : f.impact === "negative"
                          ? "fail"
                          : f.impact === "watch"
                          ? "warn"
                          : "info"
                      }
                    >
                      {f.impact}
                    </StatusPill>
                  )}
                </div>
                {f.relevance && (
                  <p className="mt-1 text-sm text-gray-600">{f.relevance}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-0.5 font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function FinancialsSnapshot({
  deal,
  investorContext,
}: {
  deal: {
    askingPrice: number | null;
    noi: number | null;
    capRateUnderwritten: number | null;
    buildingSize: number | null;
    loanAmount: number | null;
    monthlyDebtService: number | null;
    monthlyNetCashFlow: number | null;
    dscrCalculated: number | null;
  };
  investorContext: InvestorContext | null;
}) {
  // When investor context is present, recalculate live from their buy box
  if (investorContext && deal.askingPrice && deal.noi) {
    const fin = computeFinance({
      price: deal.askingPrice,
      noi: deal.noi,
      ltv: investorContext.ltv,
      ratePercent: investorContext.interestRate,
      amortizationYears: investorContext.amortizationYears,
      currentMonthlyIncome: investorContext.currentMonthlyIncome,
    });
    return (
      <div className="card grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Metric label="Loan Amount" value={fmtMoney(fin.loanAmount)} />
        <Metric label="Equity Required" value={fmtMoney(fin.equityRequired)} />
        <Metric label="Monthly Debt Service" value={fmtMoney(fin.monthlyDebtService)} />
        <Metric label="Monthly Net Cash Flow" value={fmtMoney(fin.monthlyNetCashFlow)} />
        <Metric label="DSCR" value={fmtDscr(fin.dscr)} />
        <Metric label="Cash-on-Cash" value={fmtPercent(fin.cashOnCash * 100)} />
        <Metric label="New Portfolio Total" value={`${fmtMoney(fin.newPortfolioMonthlyTotal)}/mo`} />
        <Metric label="Cap Rate (calc)" value={fmtPercent(fin.capRate * 100)} />
        <Metric label="Building SF" value={deal.buildingSize ?? "—"} />
      </div>
    );
  }

  // Default: show stored values
  return (
    <div className="card grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      <Metric label="Loan Amount" value={fmtMoney(deal.loanAmount)} />
      <Metric label="Monthly Debt Service" value={fmtMoney(deal.monthlyDebtService)} />
      <Metric label="Monthly Net Cash Flow" value={fmtMoney(deal.monthlyNetCashFlow)} />
      <Metric label="DSCR (calc)" value={fmtDscr(deal.dscrCalculated)} />
      <Metric label="Cap Rate (underwritten)" value={fmtPercent(deal.capRateUnderwritten)} />
      <Metric label="Building SF" value={deal.buildingSize ?? "—"} />
    </div>
  );
}
