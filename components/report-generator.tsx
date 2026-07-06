"use client";

import { useState, useRef } from "react";
import { GradeBadge } from "@/components/ui";
import { labelFor, ASSET_TYPES, LEASE_TYPES, GUARANTY_TYPES } from "@/lib/constants";
import { fmtMoney, fmtPercent, fmtDscr } from "@/lib/format";
import { Loader2, FileText, CheckSquare, Square, Building2, Store, Mail, Copy, Check, Clock, Pencil, PencilOff } from "lucide-react";
import { PrintFooter } from "@/components/print-footer";
import clsx from "clsx";

// ── Types ──────────────────────────────────────────────────────────────────

type DealOption = {
  id: string;
  address: string | null;
  tenantName: string | null;
  grade: string | null;
  score: number | null;
  assetType: string | null;
};

type SiteOption = {
  id: string;
  name: string | null;
  city: string | null;
  state: string | null;
  score: number | null;
  grade: string | null;
};

type TenantOption = {
  id: string;
  name: string;
  company: string | null;
  sites: SiteOption[];
};

type PastReport = {
  id: string;
  title: string | null;
  generatedAt: string;
  dealCount: number;
};

type PastSiteReport = {
  id: string;
  title: string | null;
  generatedAt: string;
  siteCount: number;
  tenantId: string;
};

type FinanceSnap = {
  loanAmount: number;
  equityRequired: number;
  monthlyDebtService: number;
  monthlyNetCashFlow: number;
  dscr: number | null;
  cashOnCash: number;
};

type ScoreRow = { category: string; points: number; max: number; status: string; detail: string };
type GapAdj = { field: string; currentValue: string; requiredValue: string; impact: string };

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

type ReportSite = {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  quadrant: string | null;
  siteType: string | null;
  squareFeet: number | null;
  askingRentPsf: number | null;
  nnnEstimate: number | null;
  leaseType: string | null;
  leaseTermOffered: string | null;
  dailyTraffic: number | null;
  population3mi: number | null;
  medianIncome: number | null;
  coTenants: string | null;
  zoning: string | null;
  brokerName: string | null;
  brokerPhone: string | null;
  score: number | null;
  grade: string | null;
  scoreBreakdown: ScoreRow[] | null;
  gapAnalysis: {
    isExceptional: boolean;
    exceptionalReason: string | null;
    buyBoxAdjustments?: GapAdj[];
    requirementAdjustments?: GapAdj[];
    verdict: string;
  } | null;
  newsFlags: { headline: string; relevance: string | null; impact: string | null }[];
  strengths: string[];
  risks: string[];
};

type DealReportData = {
  reportId: string;
  investor: { name: string; entityName: string | null };
  execSummary: string;
  recommendation: string;
  deals: ReportDeal[];
};

type SiteReportData = {
  tenant: { name: string; company: string | null };
  requirements: string;
  execSummary: string;
  recommendation: string;
  sites: ReportSite[];
};

// ── Status pill ────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  pass: "bg-green-100 text-green-800",
  warn: "bg-yellow-100 text-yellow-800",
  fail: "bg-red-100 text-red-800",
  info: "bg-gray-100 text-gray-600",
};

function StatusPill({ status, children }: { status: string; children: React.ReactNode }) {
  return (
    <span className={clsx("rounded px-1.5 py-0.5 text-xs font-medium shrink-0", STATUS_STYLE[status] ?? STATUS_STYLE.info)}>
      {children}
    </span>
  );
}

// ── Generic picker list ────────────────────────────────────────────────────

function PickerList<T extends { id: string }>({
  items,
  selected,
  onToggle,
  renderItem,
}: {
  items: T[];
  selected: string[];
  onToggle: (id: string) => void;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
}) {
  return (
    <ul className="divide-y divide-gray-100">
      {items.map((item) => {
        const isSelected = selected.includes(item.id);
        return (
          <li key={item.id}>
            <button
              onClick={() => onToggle(item.id)}
              className="flex min-h-touch w-full items-center gap-3 py-2 text-left"
            >
              {isSelected ? (
                <CheckSquare className="h-5 w-5 shrink-0 text-brand" />
              ) : (
                <Square className="h-5 w-5 shrink-0 text-gray-400" />
              )}
              {renderItem(item, isSelected)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ReportGenerator({
  allInvestors = [],
  activeInvestorId,
  investor,
  deals,
  pastReports,
  pastSiteReports = [],
  tenants = [],
  defaultMode = "investor",
}: {
  allInvestors?: { id: string; name: string }[];
  activeInvestorId?: string | null;
  investor: { id: string; name: string } | null;
  deals: DealOption[];
  pastReports: PastReport[];
  pastSiteReports?: PastSiteReport[];
  tenants?: TenantOption[];
  defaultMode?: "investor" | "tenant";
}) {
  const [mode, setMode] = useState<"investor" | "tenant">(defaultMode);
  const [selectedDeals, setSelectedDeals] = useState<string[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [dealReport, setDealReport] = useState<DealReportData | null>(null);
  const [siteReport, setSiteReport] = useState<SiteReportData | null>(null);
  const [showScore, setShowScore] = useState(true);
  const [loadingPastId, setLoadingPastId] = useState<string | null>(null);
  const [viewingPast, setViewingPast] = useState(false);

  const activeTenant = tenants.find((t) => t.id === selectedTenantId) ?? null;

  function toggleDeal(id: string) {
    setSelectedDeals((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleSite(id: string) {
    setSelectedSites((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function switchMode(m: "investor" | "tenant") {
    setMode(m);
    setDealReport(null);
    setSiteReport(null);
    setError("");
    setSelectedDeals([]);
    setSelectedSites([]);
    setViewingPast(false);
  }

  async function loadPastDealReport(id: string) {
    setLoadingPastId(id);
    setDealReport(null);
    setError("");
    try {
      const res = await fetch(`/api/reports/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load report");
      setDealReport(data.reportData as DealReportData);
      setViewingPast(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setLoadingPastId(null);
    }
  }

  async function loadPastSiteReport(id: string) {
    setLoadingPastId(id);
    setSiteReport(null);
    setError("");
    try {
      const res = await fetch(`/api/reports/sites/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load report");
      setSiteReport(data.reportData as SiteReportData);
      setViewingPast(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setLoadingPastId(null);
    }
  }

  async function generateDealReport() {
    if (!investor || selectedDeals.length === 0) return;
    setGenerating(true);
    setError("");
    setDealReport(null);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorId: investor.id, dealIds: selectedDeals }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setDealReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setGenerating(false);
    }
  }

  async function generateSiteReport() {
    if (!selectedTenantId || selectedSites.length === 0) return;
    setGenerating(true);
    setError("");
    setSiteReport(null);
    try {
      const res = await fetch("/api/reports/sites/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: selectedTenantId, siteIds: selectedSites }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSiteReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      {!viewingPast && <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <button
          onClick={() => switchMode("investor")}
          className={clsx(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            mode === "investor" ? "bg-white shadow text-brand" : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Building2 className="h-4 w-4" /> Investor / Deals
        </button>
        <button
          onClick={() => switchMode("tenant")}
          className={clsx(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            mode === "tenant" ? "bg-white shadow text-brand" : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Store className="h-4 w-4" /> Tenant / Sites
        </button>
      </div>}

      {viewingPast && (
        <button
          onClick={() => { setViewingPast(false); setDealReport(null); setSiteReport(null); }}
          className="btn-secondary text-sm print:hidden"
        >
          ← Back to reports
        </button>
      )}

      {/* ── INVESTOR MODE ── */}
      {mode === "investor" && !viewingPast && (
        <div className="space-y-5">
          {allInvestors.length > 1 && (
            <div className="card flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Generate report for:</label>
              <div className="flex flex-wrap gap-2">
                {allInvestors.map((inv) => (
                  <a
                    key={inv.id}
                    href={`/reports?investorId=${inv.id}`}
                    className={clsx(
                      "rounded-full border px-3 py-1.5 text-sm font-medium",
                      activeInvestorId === inv.id
                        ? "border-brand bg-brand text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    )}
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
              <div className="card">
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="font-semibold">Select deals to compare</h2>
                  {deals.length > 0 && (
                    <button
                      onClick={() =>
                        selectedDeals.length === deals.length
                          ? setSelectedDeals([])
                          : setSelectedDeals(deals.map((d) => d.id))
                      }
                      className="text-xs text-brand underline-offset-2 hover:underline"
                    >
                      {selectedDeals.length === deals.length ? "Deselect all" : "Select all"}
                    </button>
                  )}
                </div>
                <p className="mb-3 text-sm text-gray-500">{selectedDeals.length} selected.</p>
                {deals.length === 0 ? (
                  <p className="text-sm text-gray-400">No active deals for this investor.</p>
                ) : (
                  <PickerList
                    items={deals}
                    selected={selectedDeals}
                    onToggle={toggleDeal}
                    renderItem={(d) => (
                      <>
                        <GradeBadge grade={d.grade} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium text-gray-900">{d.address ?? "—"}</p>
                          <p className="truncate text-xs text-gray-500">
                            {d.tenantName ?? "—"} · {labelFor(ASSET_TYPES, d.assetType)}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-gray-600">{d.score?.toFixed(0) ?? "—"}</span>
                      </>
                    )}
                  />
                )}
              </div>

              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={showScore} onChange={(e) => setShowScore(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand" />
                Show score in report
              </label>

              <button
                onClick={generateDealReport}
                disabled={generating || selectedDeals.length === 0}
                className="btn-primary w-full"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating report…</>
                ) : (
                  <><FileText className="h-4 w-4" /> Generate Report ({selectedDeals.length} deal{selectedDeals.length !== 1 ? "s" : ""})</>
                )}
              </button>

              {dealReport && !viewingPast && <DealReportOutput report={dealReport} showScore={showScore} />}

              {pastReports.length > 0 && (
                <div className="card">
                  <div className="mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <h2 className="font-semibold text-gray-700">Past Reports</h2>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {pastReports.map((r) => (
                      <li key={r.id} className="flex items-center justify-between py-2 text-sm gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{r.title ?? "Report"}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(r.generatedAt).toLocaleDateString()} · {r.dealCount} deal{r.dealCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => loadPastDealReport(r.id)}
                          disabled={loadingPastId === r.id}
                          className="btn-secondary text-xs shrink-0"
                        >
                          {loadingPastId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "View"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Past report output (shared, shown when viewingPast) ── */}
      {viewingPast && mode === "investor" && dealReport && (
        <DealReportOutput report={dealReport} showScore={showScore} />
      )}
      {viewingPast && mode === "tenant" && siteReport && (
        <SiteReportOutput report={siteReport} showScore={showScore} />
      )}

      {/* ── TENANT MODE ── */}
      {mode === "tenant" && !viewingPast && (
        <div className="space-y-5">
          {tenants.length === 0 ? (
            <p className="text-sm text-gray-400">No tenant clients yet. Add tenants to generate site reports.</p>
          ) : (
            <>
              <div className="card">
                <h2 className="mb-1 font-semibold">Select tenant client</h2>
                <p className="mb-3 text-sm text-gray-500">Choose the client you are generating a site comparison report for.</p>
                <div className="flex flex-wrap gap-2">
                  {tenants.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTenantId(t.id);
                        setSelectedSites([]);
                        setSiteReport(null);
                      }}
                      className={clsx(
                        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                        selectedTenantId === t.id
                          ? "border-brand bg-brand text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      {t.name}
                      {t.sites.length > 0 && (
                        <span className={clsx(
                          "ml-1.5 rounded-full px-1.5 text-xs",
                          selectedTenantId === t.id ? "bg-white/30" : "bg-gray-100"
                        )}>
                          {t.sites.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {activeTenant && (
                <div className="card">
                  <div className="mb-1 flex items-center justify-between">
                    <h2 className="font-semibold">Select sites — {activeTenant.name}</h2>
                    {activeTenant.sites.length > 0 && (
                      <button
                        onClick={() =>
                          selectedSites.length === activeTenant.sites.length
                            ? setSelectedSites([])
                            : setSelectedSites(activeTenant.sites.map((s) => s.id))
                        }
                        className="text-xs text-brand underline-offset-2 hover:underline"
                      >
                        {selectedSites.length === activeTenant.sites.length ? "Deselect all" : "Select all"}
                      </button>
                    )}
                  </div>
                  <p className="mb-3 text-sm text-gray-500">{selectedSites.length} selected.</p>
                  {activeTenant.sites.length === 0 ? (
                    <p className="text-sm text-gray-400">No sites assigned to this tenant yet.</p>
                  ) : (
                    <PickerList
                      items={activeTenant.sites}
                      selected={selectedSites}
                      onToggle={toggleSite}
                      renderItem={(s) => (
                        <>
                          <GradeBadge grade={s.grade} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium text-gray-900">{s.name ?? "Unnamed site"}</p>
                            <p className="truncate text-xs text-gray-500">
                              {[s.city, s.state].filter(Boolean).join(", ") || "—"}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-gray-600">{s.score?.toFixed(0) ?? "—"}</span>
                        </>
                      )}
                    />
                  )}
                </div>
              )}

              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={showScore} onChange={(e) => setShowScore(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand" />
                Show score in report
              </label>

              {activeTenant && (
                <button
                  onClick={generateSiteReport}
                  disabled={generating || selectedSites.length === 0}
                  className="btn-primary w-full"
                >
                  {generating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating report…</>
                  ) : (
                    <><FileText className="h-4 w-4" /> Generate Report ({selectedSites.length} site{selectedSites.length !== 1 ? "s" : ""})</>
                  )}
                </button>
              )}

              {siteReport && !viewingPast && <SiteReportOutput report={siteReport} showScore={showScore} />}

              {(() => {
                const tenantPastReports = selectedTenantId
                  ? pastSiteReports.filter((r) => r.tenantId === selectedTenantId)
                  : pastSiteReports;
                if (tenantPastReports.length === 0) return null;
                return (
                  <div className="card">
                    <div className="mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <h2 className="font-semibold text-gray-700">Past Reports</h2>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {tenantPastReports.map((r) => (
                        <li key={r.id} className="flex items-center justify-between py-2 text-sm gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{r.title ?? "Report"}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(r.generatedAt).toLocaleDateString()} · {r.siteCount} site{r.siteCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <button
                            onClick={() => loadPastSiteReport(r.id)}
                            disabled={loadingPastId === r.id}
                            className="btn-secondary text-xs shrink-0"
                          >
                            {loadingPastId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "View"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Email draft ────────────────────────────────────────────────────────────

function EmailDraft({ subject, body }: { subject: string; body: string }) {
  const [copied, setCopied] = useState<"subject" | "all" | null>(null);

  function copy(what: "subject" | "all") {
    const text = what === "subject" ? subject : `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="card space-y-3 print:hidden border-brand/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-brand" />
          <h3 className="font-semibold text-gray-900">Email Draft</h3>
        </div>
        <button onClick={() => copy("all")} className="btn-secondary text-sm flex items-center gap-1.5">
          {copied === "all" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied === "all" ? "Copied!" : "Copy all"}
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Subject</p>
          <button onClick={() => copy("subject")} className="text-xs text-brand hover:underline flex items-center gap-1">
            {copied === "subject" ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
          </button>
        </div>
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 select-all">{subject}</p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Body</p>
        <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 font-sans select-all leading-relaxed">{body}</pre>
      </div>
    </div>
  );
}

// ── Deal report output ─────────────────────────────────────────────────────

function DealReportOutput({ report, showScore = true }: { report: DealReportData; showScore?: boolean }) {
  const [editing, setEditing] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  function toggleEdit() {
    const next = !editing;
    setEditing(next);
    if (reportRef.current) {
      reportRef.current.contentEditable = next ? "true" : "false";
      if (next) reportRef.current.focus();
    }
  }

  return (
    <div className="space-y-4 print:block" id="report-output">
      <div
        ref={reportRef}
        className={clsx("space-y-4 rounded-xl outline-none", editing && "ring-2 ring-amber-300 ring-offset-2")}
      >
      <div className="card print:shadow-none">
        <div className="mb-4 border-b border-gray-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Blake-Dickson Commercial Real Estate</p>
          <h2 className="mt-1 text-xl font-bold text-brand">Net Lease Investment Report</h2>
          <p className="text-sm text-gray-600">
            {report.investor.name}{report.investor.entityName ? ` · ${report.investor.entityName}` : ""}
          </p>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <h3 className="mb-1 font-semibold">Executive Summary</h3>
        <p className="text-sm text-gray-700">{report.execSummary}</p>
      </div>

      {report.deals.map((d) => (
        <div key={d.id} className="card print:shadow-none print:break-inside-avoid">
          <div className="mb-3 flex items-center gap-3">
            {showScore && <GradeBadge grade={d.grade} size="lg" />}
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
      </div>

      <div className="flex gap-2 print:hidden">
        <button
          onClick={toggleEdit}
          className={clsx("btn-secondary flex-1", editing && "ring-2 ring-amber-400")}
        >
          {editing ? <><PencilOff className="h-4 w-4" /> Done editing</> : <><Pencil className="h-4 w-4" /> Edit report</>}
        </button>
        <button onClick={() => window.print()} className="btn-secondary flex-1">
          <FileText className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>
      {editing && (
        <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 print:hidden">
          Click any text to edit or delete it. Changes only affect this session.
        </p>
      )}

      <EmailDraft
        subject={`Net Lease Deal Analysis — ${report.investor.name} — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
        body={[
          `${report.investor.name},`,
          ``,
          `Please find attached a net lease investment analysis report comparing ${report.deals.length} deal${report.deals.length !== 1 ? "s" : ""} we${report.investor.entityName ? ` have been tracking for ${report.investor.entityName}` : "'ve been reviewing"}.`,
          ``,
          report.execSummary,
          ``,
          report.recommendation,
          ``,
          `Please review the attached report and let me know if you have any questions or would like to schedule a call to discuss.`,
          ``,
          `Best regards,`,
          `Blake-Dickson Commercial Real Estate`,
        ].join("\n")}
      />

      <PrintFooter />
    </div>
  );
}

// ── Site report output ─────────────────────────────────────────────────────

function SiteReportOutput({ report, showScore = true }: { report: SiteReportData; showScore?: boolean }) {
  const [editing, setEditing] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  function toggleEdit() {
    const next = !editing;
    setEditing(next);
    if (reportRef.current) {
      reportRef.current.contentEditable = next ? "true" : "false";
      if (next) reportRef.current.focus();
    }
  }

  return (
    <div className="space-y-4 print:block" id="report-output">
      <div
        ref={reportRef}
        className={clsx("space-y-4 rounded-xl outline-none", editing && "ring-2 ring-amber-300 ring-offset-2")}
      >
      <div className="card print:shadow-none">
        <div className="mb-4 border-b border-gray-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Blake-Dickson Commercial Real Estate · Tenant Rep
          </p>
          <h2 className="mt-1 text-xl font-bold text-brand">Site Comparison Report</h2>
          <p className="text-sm text-gray-600">
            {report.tenant.name}{report.tenant.company ? ` · ${report.tenant.company}` : ""}
          </p>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        {report.requirements && (
          <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Requirements: {report.requirements}
          </p>
        )}
        <h3 className="mb-1 font-semibold">Executive Summary</h3>
        <p className="text-sm text-gray-700">{report.execSummary}</p>
      </div>

      {report.sites.map((s) => {
        const adjustments = s.gapAnalysis?.buyBoxAdjustments ?? s.gapAnalysis?.requirementAdjustments ?? [];
        return (
          <div key={s.id} className="card print:shadow-none print:break-inside-avoid space-y-4">
            <div className="flex items-start gap-3">
              {showScore && <GradeBadge grade={s.grade} size="lg" />}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900">{s.name ?? "Unnamed site"}</h3>
                <p className="text-sm text-gray-500">
                  {[s.address, [s.city, s.state].filter(Boolean).join(", "), s.quadrant].filter(Boolean).join(" · ")}
                </p>
                {s.siteType && s.siteType !== "—" && (
                  <span className="text-xs text-gray-400">{s.siteType}</span>
                )}
              </div>
              {showScore && s.score != null && (
                <span className="text-lg font-bold text-gray-700 shrink-0">{s.score.toFixed(0)}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {s.squareFeet != null && <><span className="text-gray-500">Size</span><span className="font-medium">{s.squareFeet.toLocaleString()} SF</span></>}
              {s.askingRentPsf != null && <><span className="text-gray-500">Asking Rent</span><span className="font-medium">${s.askingRentPsf}/SF NNN</span></>}
              {s.nnnEstimate != null && <><span className="text-gray-500">NNN Est.</span><span className="font-medium">${s.nnnEstimate}/SF</span></>}
              {s.squareFeet != null && s.askingRentPsf != null && (
                <>
                  <span className="text-gray-500">Est. Monthly Rent</span>
                  <span className="font-medium">
                    {fmtMoney(((s.askingRentPsf ?? 0) + (s.nnnEstimate ?? 0)) * s.squareFeet / 12)}
                    <span className="text-xs text-gray-400 ml-1">/mo</span>
                  </span>
                </>
              )}
              {s.leaseType && s.leaseType !== "—" && <><span className="text-gray-500">Lease Type</span><span className="font-medium">{s.leaseType}</span></>}
              {s.leaseTermOffered && <><span className="text-gray-500">Term Offered</span><span className="font-medium">{s.leaseTermOffered}</span></>}
              {s.dailyTraffic != null && <><span className="text-gray-500">Traffic</span><span className="font-medium">{s.dailyTraffic.toLocaleString()} VPD</span></>}
              {s.population3mi != null && <><span className="text-gray-500">Population 3mi</span><span className="font-medium">{s.population3mi.toLocaleString()}</span></>}
              {s.medianIncome != null && <><span className="text-gray-500">Median Income</span><span className="font-medium">${Math.round(s.medianIncome / 1000)}K</span></>}
              {s.coTenants && <><span className="text-gray-500">Co-Tenants</span><span className="font-medium">{s.coTenants}</span></>}
              {s.zoning && <><span className="text-gray-500">Zoning</span><span className="font-medium">{s.zoning}</span></>}
              {s.brokerName && <><span className="text-gray-500">Broker</span><span className="font-medium">{s.brokerName}</span></>}
              {s.brokerPhone && <><span className="text-gray-500">Phone</span><span className="font-medium">{s.brokerPhone}</span></>}
            </div>

            {showScore && s.scoreBreakdown && s.scoreBreakdown.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Score Breakdown</p>
                <div className="space-y-1">
                  {s.scoreBreakdown.map((row, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <StatusPill status={row.status}>{row.points}/{row.max}</StatusPill>
                      <span className="font-medium text-gray-800 w-32 shrink-0">{row.category}</span>
                      <span className="text-gray-500 truncate">{row.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {s.gapAnalysis && (
              <div className={clsx("rounded-lg border-2 p-3", s.gapAnalysis.isExceptional ? "border-amber-400 bg-amber-50" : "border-gray-200")}>
                <p className="font-semibold text-sm mb-1">
                  {s.gapAnalysis.isExceptional ? "Exceptional Flag" : "Gap Analysis"}
                </p>
                <p className="text-sm text-gray-700 mb-1">{s.gapAnalysis.verdict}</p>
                {s.gapAnalysis.exceptionalReason && (
                  <p className="text-sm text-amber-800 font-medium mb-1">{s.gapAnalysis.exceptionalReason}</p>
                )}
                {adjustments.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {adjustments.map((adj, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-gray-800 w-28 shrink-0">{adj.field}</span>
                        <span className="text-red-600 line-through">{adj.currentValue}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-700 font-medium">{adj.requiredValue}</span>
                        <span className="text-gray-500">{adj.impact}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {s.newsFlags.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">News Flags</p>
                <ul className="space-y-1">
                  {s.newsFlags.map((f, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium text-gray-800">{f.headline}</span>
                      {f.relevance && <span className="ml-2 text-gray-500">{f.relevance}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-green-700">Strengths</p>
                <ul className="mt-1 space-y-1 text-sm text-gray-700">
                  {s.strengths.map((str, i) => <li key={i}>• {str}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-red-700">Risks</p>
                <ul className="mt-1 space-y-1 text-sm text-gray-700">
                  {s.risks.map((r, i) => <li key={i}>• {r}</li>)}
                </ul>
              </div>
            </div>
          </div>
        );
      })}

      <div className="card print:shadow-none">
        <h3 className="mb-1 font-semibold">Recommendation</h3>
        <p className="text-sm text-gray-700">{report.recommendation}</p>
      </div>
      </div>

      <div className="flex gap-2 print:hidden">
        <button
          onClick={toggleEdit}
          className={clsx("btn-secondary flex-1", editing && "ring-2 ring-amber-400")}
        >
          {editing ? <><PencilOff className="h-4 w-4" /> Done editing</> : <><Pencil className="h-4 w-4" /> Edit report</>}
        </button>
        <button onClick={() => window.print()} className="btn-secondary flex-1">
          <FileText className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>
      {editing && (
        <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 print:hidden">
          Click any text to edit or delete it. Changes only affect this session.
        </p>
      )}

      <EmailDraft
        subject={`Site Comparison Report — ${report.tenant.name} — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
        body={[
          `${report.tenant.name},`,
          ``,
          `Please find attached a site comparison report evaluating ${report.sites.length} site${report.sites.length !== 1 ? "s" : ""} for your consideration${report.tenant.company ? ` on behalf of ${report.tenant.company}` : ""}.`,
          ``,
          report.execSummary,
          ``,
          report.recommendation,
          ``,
          `Please review the attached and let me know which sites you'd like to prioritize or if you'd like to schedule time to walk through the findings together.`,
          ``,
          `Best regards,`,
          `Blake-Dickson Commercial Real Estate`,
        ].join("\n")}
      />

      <PrintFooter />
    </div>
  );
}
