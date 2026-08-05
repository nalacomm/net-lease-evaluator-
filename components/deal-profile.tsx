"use client";

import { useState, useMemo } from "react";
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
import { computeScoreFromBreakdown, CategoryScore } from "@/lib/scoring";
import {
  RefreshCw,
  Pencil,
  Calculator,
  Loader2,
  ChevronDown,
  FileDown,
  Trash2,
  Lightbulb,
  Paperclip,
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
  quadrant: string | null;
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
  walt: number | null;
  rentRoll: { tenantName: string; suite?: string | null; squareFeet?: number | null; annualRent: number; remainingYears: number; leaseType?: string | null; bumpPercent?: number | null; creditType?: string | null }[] | null;
  hhi3Mile: number | null;
  population1Mile: number | null;
  dscrCalculated: number | null;
  loanAmount: number | null;
  monthlyDebtService: number | null;
  monthlyNetCashFlow: number | null;
  dealCategory: string;
  score: number | null;
  grade: string | null;
  scoreRationale: string | null;
  scoreBreakdown: Category[] | null;
  confidenceLevel: string | null;
  selfCheckerNotes: string | null;
  primaryInvestorName: string | null;
  analysisContext: string | null;
  scoringConfig: { enabledCategories?: string[] } | null;
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

type GapAnalysisData = {
  isExceptional: boolean;
  exceptionalReason: string | null;
  buyBoxAdjustments: { field: string; currentValue: string; requiredValue: string; impact: string }[];
  verdict: string;
};

export function DealProfile({
  deal,
  allInvestors = [],
  investorContext = null,
  cachedGapAnalysis = null,
  prevId = null,
  nextId = null,
  totalCount = 0,
  currentIndex = 0,
}: {
  deal: Deal;
  allInvestors?: { id: string; name: string }[];
  investorContext?: InvestorContext | null;
  cachedGapAnalysis?: GapAnalysisData | null;
  prevId?: string | null;
  nextId?: string | null;
  totalCount?: number;
  currentIndex?: number;
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
  // Initialize from cached assignment data — no re-run needed on revisit
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisData | null>(cachedGapAnalysis ?? null);
  const [gapLoading, setGapLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [contextText, setContextText] = useState(deal.analysisContext ?? "");
  const [contextFiles, setContextFiles] = useState<File[]>([]);
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(() => {
    const saved = deal.scoringConfig?.enabledCategories;
    if (saved) return new Set(saved);
    return new Set((deal.scoreBreakdown ?? []).filter((c) => c.max > 0).map((c) => c.category));
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingContext, setSavingContext] = useState(false);

  // Recompute score live from the stored breakdown as toggles change.
  // This makes the badge update instantly without waiting for PATCH + router.refresh().
  const { score: liveScore, grade: liveGrade } = useMemo(() => {
    if (!deal.scoreBreakdown) {
      return { score: deal.score ?? 0, grade: (deal.grade ?? "F") as "A" | "B" | "C" | "D" | "F" };
    }
    return computeScoreFromBreakdown(deal.scoreBreakdown as CategoryScore[], enabledCategories);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.scoreBreakdown, deal.score, deal.grade, deal.dealCategory, enabledCategories]);

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

  async function saveContext() {
    setSavingContext(true);
    await fetch(`/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisContext: contextText }),
    });
    setSavingContext(false);
  }

  async function toggleCategory(category: string) {
    const next = new Set(enabledCategories);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    setEnabledCategories(next);
    const { score, grade } = computeScoreFromBreakdown(deal.scoreBreakdown as CategoryScore[] ?? [], next);
    setSavingConfig(true);
    await fetch(`/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scoringConfig: { enabledCategories: Array.from(next) }, score, grade }),
    });
    setSavingConfig(false);
    router.refresh();
  }

  async function runGapAnalysis() {
    setGapLoading(true);
    setGapAnalysis(null);
    try {
      const fd = new FormData();
      fd.append("investorId", investorContext?.investorId ?? "");
      fd.append("additionalContext", contextText);
      contextFiles.forEach((f) => fd.append("files", f));
      const res = await fetch(`/api/deals/${deal.id}/gap-analysis`, {
        method: "POST",
        body: fd,
      });
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
      {/* Prev / Next nav */}
      {(prevId || nextId) && (
        <div className="flex items-center justify-between text-sm">
          {prevId ? (
            <Link href={`/deals/${prevId}`} className="btn-secondary">
              ← Previous
            </Link>
          ) : <span />}
          <span className="text-gray-400 text-xs">{currentIndex + 1} of {totalCount}</span>
          {nextId ? (
            <Link href={`/deals/${nextId}`} className="btn-secondary">
              Next →
            </Link>
          ) : <span />}
        </div>
      )}

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
              {deal.quadrant ? (
                <span className="ml-1 inline-block rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                  {deal.quadrant}
                </span>
              ) : null}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill status="info">
                {labelFor(DEAL_STATUSES, deal.status)}
              </StatusPill>
              {deal.dealCategory === "other_cre" && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                  Other CRE
                </span>
              )}
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
          {(deal.score != null || deal.grade != null) && (
            <div className="flex flex-col items-center text-center">
              <GradeBadge grade={liveGrade} size="lg" />
              <span className="mt-1 text-lg font-bold text-gray-900">
                {liveScore > 0 ? liveScore.toFixed(0) : (deal.score?.toFixed(0) ?? "—")}
              </span>
              <span className="mt-0.5 text-[10px] text-gray-400 max-w-[80px] leading-tight">
                {investorContext
                  ? investorContext.investorName
                  : (deal.primaryInvestorName ?? "primary buy box")}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={reanalyze} disabled={busy} className="btn-secondary">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Re-score
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
            title="AI analysis of this deal against the investor buy box"
          >
            {gapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
            AI Analysis
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

        {/* Analysis context panel */}
        <div className="mt-3 border-t border-gray-100 pt-3">
          <button
            onClick={() => setShowContext((s) => !s)}
            className="flex w-full items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <Paperclip className="h-4 w-4 shrink-0" />
            <span className="font-medium">
              Context for Gap Analysis
              {(contextText.trim() || contextFiles.length > 0) && (
                <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-brand align-middle" />
              )}
            </span>
            <ChevronDown className={`ml-auto h-4 w-4 transition ${showContext ? "rotate-180" : ""}`} />
          </button>

          {showContext && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="label">Additional notes / details</label>
                <textarea
                  className="input min-h-[100px]"
                  placeholder="Paste broker notes, deal commentary, tenant background, location details, or anything else Claude should consider during analysis…"
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Attach PDFs (included in this run only)</label>
                <input
                  type="file"
                  accept="application/pdf,.txt"
                  multiple
                  className="block w-full text-sm text-gray-500 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700"
                  onChange={(e) => setContextFiles(Array.from(e.target.files ?? []))}
                />
                {contextFiles.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {contextFiles.map((f) => f.name).join(", ")}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={saveContext}
                  disabled={savingContext}
                  className="btn-secondary text-xs"
                >
                  {savingContext ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Save notes
                </button>
                <button
                  onClick={async () => { await saveContext(); await runGapAnalysis(); }}
                  disabled={savingContext || gapLoading}
                  className="btn-primary text-xs"
                >
                  {gapLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lightbulb className="h-3 w-3" />}
                  Save & Run Analysis
                </button>
                <span className="text-xs text-gray-400">Notes persist. PDFs apply to this run only.</span>
              </div>
            </div>
          )}
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
          {deal.dealCategory === "multi_tenant" ? (
            <div className="card grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Metric label="Asking Price" value={fmtMoney(deal.askingPrice)} />
              <Metric label="NOI" value={fmtMoney(deal.noi)} />
              <Metric label="Cap Rate" value={fmtPercent(deal.capRateAsking)} />
              <Metric label="GLA" value={deal.grossLeasableArea ? `${deal.grossLeasableArea.toLocaleString()} SF` : "—"} />
              <Metric label="Vacancy" value={deal.vacancyRate != null ? `${deal.vacancyRate}%` : "—"} />
              <Metric label="Tenants" value={deal.numberOfTenants ?? "—"} />
              <Metric label="DSCR" value={fmtDscr(deal.dscrCalculated)} />
              <Metric label="Mo. Cash Flow" value={fmtMoney(deal.monthlyNetCashFlow)} />
              {deal.walt != null && (
                <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 shrink-0">
                    <span className="text-xs font-bold text-brand">{deal.walt.toFixed(1)}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">WALT</p>
                    <p className="text-sm font-semibold text-gray-900">{deal.walt.toFixed(1)} yrs</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
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
          )}

          {/* Rent roll for multi-tenant deals */}
          {deal.dealCategory === "multi_tenant" && deal.rentRoll && deal.rentRoll.length > 0 && (
            <div className="card">
              <h3 className="mb-2 font-semibold">Rent Roll</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                      <th className="pb-2 pr-4">Tenant</th>
                      <th className="pb-2 pr-4 text-right">SF</th>
                      <th className="pb-2 pr-4 text-right">Annual Rent</th>
                      <th className="pb-2 pr-4 text-right">Yrs Left</th>
                      <th className="pb-2 text-left">Lease</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {deal.rentRoll.map((r, i) => {
                      const expYr = new Date().getFullYear() + Math.ceil(r.remainingYears);
                      return (
                        <tr key={i}>
                          <td className="py-2 pr-4 font-medium text-gray-900">
                            {r.tenantName}
                            {r.creditType === "national" && <span className="ml-1.5 rounded bg-blue-50 px-1 py-0.5 text-[10px] font-semibold text-blue-700">NAT</span>}
                            {r.creditType === "regional" && <span className="ml-1.5 rounded bg-purple-50 px-1 py-0.5 text-[10px] font-semibold text-purple-700">REG</span>}
                          </td>
                          <td className="py-2 pr-4 text-right text-gray-500">{r.squareFeet != null ? r.squareFeet.toLocaleString() : "—"}</td>
                          <td className="py-2 pr-4 text-right text-gray-500">${(r.annualRent / 1000).toFixed(0)}K</td>
                          <td className="py-2 pr-4 text-right">
                            <span className={`font-medium ${r.remainingYears < 2 ? "text-red-600" : r.remainingYears < 4 ? "text-yellow-600" : "text-gray-700"}`}>
                              {r.remainingYears.toFixed(1)} <span className="text-xs text-gray-400">({expYr})</span>
                            </span>
                          </td>
                          <td className="py-2 text-xs text-gray-500">{r.leaseType ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td className="pt-2 text-xs font-semibold text-gray-500">Total / WALT</td>
                      <td className="pt-2 pr-4 text-right text-xs text-gray-500">
                        {deal.rentRoll.reduce((s, r) => s + (r.squareFeet ?? 0), 0).toLocaleString()} SF
                      </td>
                      <td className="pt-2 pr-4 text-right text-xs font-semibold text-gray-700">
                        ${(deal.rentRoll.reduce((s, r) => s + r.annualRent, 0) / 1000).toFixed(0)}K/yr
                      </td>
                      <td className="pt-2 pr-4 text-right text-xs font-semibold text-brand">
                        {deal.walt?.toFixed(1) ?? "—"} yrs WALT
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Score breakdown */}
          {deal.scoreBreakdown && (
            <div className="card">
              <button
                onClick={() => setShowBreakdown((s) => !s)}
                className="flex w-full items-center justify-between"
              >
                <div>
                <span className="font-semibold">Score Breakdown</span>
                {deal.dealCategory === "other_cre" && (
                  <p className="text-xs text-gray-400 mt-0.5">Scored against investor buy box using applicable criteria — NNN fields not included.</p>
                )}
                {deal.dealCategory === "multi_tenant" && (
                  <p className="text-xs text-gray-400 mt-0.5">Scored using multi-tenant criteria: cap rate, DSCR, WALT, occupancy, and lease stagger.</p>
                )}
              </div>
                <ChevronDown
                  className={`h-5 w-5 transition ${showBreakdown ? "rotate-180" : ""}`}
                />
              </button>
              {showBreakdown && deal.scoreBreakdown && (() => {
                return (
                  <>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>
                        Score: <span className="font-semibold text-gray-800">{liveScore}</span> · {liveGrade}
                      </span>
                      {savingConfig && <span className="text-brand">Saving…</span>}
                    </div>
                    <ul className="mt-2 space-y-2">
                      {deal.scoreBreakdown.map((c) => {
                        const canToggle = c.max > 0;
                        const checked = enabledCategories.has(c.category);
                        return (
                          <li
                            key={c.category}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              {canToggle ? (
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleCategory(c.category)}
                                  className="h-4 w-4 shrink-0 rounded border-gray-300 text-brand accent-brand"
                                />
                              ) : (
                                <div className="h-4 w-4 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className={`font-medium ${checked ? "text-gray-800" : "text-gray-400"}`}>
                                  {c.category}
                                </p>
                                <p className={`truncate text-xs ${checked ? "text-gray-500" : "text-gray-300"}`}>
                                  {c.detail}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusPill
                                status={checked ? (STATUS_MAP[c.status] ?? "info") : "info"}
                              >
                                {c.max === 0 ? "—" : `${c.points}/${c.max}`}
                              </StatusPill>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                );
              })()}
            </div>
          )}

          {/* Self-checker — net lease only */}
          {deal.dealCategory !== "other_cre" && deal.selfCheckerNotes && (
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
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Lightbulb className={clsx("h-5 w-5", gapAnalysis.isExceptional ? "text-amber-600" : "text-gray-400")} />
                <h3 className="font-semibold text-gray-900">
                  {gapAnalysis.isExceptional ? "Exceptional Deal Flag" : "Gap Analysis"}
                </h3>
                {gapAnalysis.isExceptional && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                    Worth a look
                  </span>
                )}
                <button
                  onClick={runGapAnalysis}
                  disabled={gapLoading}
                  className="ml-auto text-xs text-gray-400 hover:text-brand"
                >
                  {gapLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "↺ Refresh"}
                </button>
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
