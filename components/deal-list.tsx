"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { fmtMoney, fmtPercent, fmtDscr } from "@/lib/format";
import { labelFor, ASSET_TYPES, DEAL_STATUSES } from "@/lib/constants";
import { GradeBadge, StatusPill } from "@/components/ui";

export type DealRow = {
  id: string;
  address: string | null;
  city: string | null;
  state: string | null;
  tenantName: string | null;
  assetType: string | null;
  askingPrice: number | null;
  capRateAsking: number | null;
  dscrCalculated: number | null;
  grade: string | null;
  score: number | null;
  status: string;
  sourcePlatform: string | null;
  createdAt: Date | string;
};

type SortKey = "address" | "tenantName" | "assetType" | "askingPrice" | "capRateAsking" | "dscrCalculated" | "grade" | "score" | "createdAt" | "status";
type SortDir = "asc" | "desc";

const GRADE_ORDER = ["A", "B", "C", "D", "F"];
function gradeNum(g: string | null) {
  if (!g) return 999;
  return GRADE_ORDER.indexOf(g[0]) * 10 + (g[1] === "+" ? -1 : g[1] === "-" ? 1 : 0);
}

function SortTh({
  label,
  col,
  sort,
  dir,
  onSort,
  className = "",
}: {
  label: string;
  col: SortKey;
  sort: SortKey;
  dir: SortDir;
  onSort: (col: SortKey) => void;
  className?: string;
}) {
  const active = sort === col;
  return (
    <th
      className={`px-3 py-2 cursor-pointer select-none whitespace-nowrap hover:text-gray-700 ${active ? "text-brand" : ""} ${className}`}
      onClick={() => onSort(col)}
    >
      {label}
      <span className="ml-1 text-[10px]">
        {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </th>
  );
}

export function DealList({
  deals,
  reportedDealIds = new Set(),
}: {
  deals: DealRow[];
  reportedDealIds?: Set<string>;
}) {
  const [sort, setSort] = useState<SortKey>("score");
  const [dir, setDir] = useState<SortDir>("desc");
  const [assetFilter, setAssetFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const stateOptions = useMemo(() => {
    const set = new Set(deals.map((d) => d.state).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [deals]);

  function onSort(col: SortKey) {
    if (sort === col) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(col);
      setDir(col === "address" || col === "tenantName" || col === "assetType" || col === "status" ? "asc" : "desc");
    }
  }

  const filtered = useMemo(() => {
    let r = [...deals];
    if (assetFilter) r = r.filter((d) => d.assetType === assetFilter);
    if (statusFilter) r = r.filter((d) => d.status === statusFilter);
    if (gradeFilter) r = r.filter((d) => d.grade === gradeFilter);
    if (stateFilter) r = r.filter((d) => d.state === stateFilter);
    if (priceMin) r = r.filter((d) => d.askingPrice != null && d.askingPrice >= Number(priceMin));
    if (priceMax) r = r.filter((d) => d.askingPrice != null && d.askingPrice <= Number(priceMax));

    r.sort((a, b) => {
      let cmp = 0;
      if (sort === "grade") {
        cmp = gradeNum(a.grade) - gradeNum(b.grade);
      } else if (sort === "createdAt") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sort === "address" || sort === "tenantName" || sort === "assetType" || sort === "status") {
        cmp = (a[sort] ?? "").localeCompare(b[sort] ?? "");
      } else {
        cmp = (a[sort] ?? -Infinity) - (b[sort] ?? -Infinity);
      }
      return dir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [deals, sort, dir, assetFilter, statusFilter, gradeFilter, stateFilter, priceMin, priceMax]);

  const activeFilters = [assetFilter, statusFilter, gradeFilter, stateFilter, priceMin, priceMax].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`btn-secondary gap-1 ${activeFilters > 0 ? "border-brand text-brand" : ""}`}
        >
          Filters {activeFilters > 0 && <span className="rounded-full bg-brand px-1.5 text-xs text-white">{activeFilters}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="card grid gap-3 sm:grid-cols-3">
          <select className="input" value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)}>
            <option value="">All Types</option>
            {ASSET_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {DEAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="input" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
            <option value="">All Grades</option>
            {["A", "B", "C", "D", "F"].map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="input" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="">All States</option>
            {stateOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="text" inputMode="numeric" className="input" placeholder="Min price ($)" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
          <input type="text" inputMode="numeric" className="input" placeholder="Max price ($)" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
          {activeFilters > 0 && (
            <button className="btn-secondary sm:col-span-3 text-sm" onClick={() => {
              setAssetFilter(""); setStatusFilter(""); setGradeFilter("");
              setStateFilter(""); setPriceMin(""); setPriceMax("");
            }}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">{filtered.length} of {deals.length} deals</p>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              <SortTh label="Address" col="address" sort={sort} dir={dir} onSort={onSort} />
              <SortTh label="Tenant" col="tenantName" sort={sort} dir={dir} onSort={onSort} />
              <SortTh label="Type" col="assetType" sort={sort} dir={dir} onSort={onSort} />
              <SortTh label="Price" col="askingPrice" sort={sort} dir={dir} onSort={onSort} className="text-right" />
              <SortTh label="Cap" col="capRateAsking" sort={sort} dir={dir} onSort={onSort} className="text-right" />
              <SortTh label="DSCR" col="dscrCalculated" sort={sort} dir={dir} onSort={onSort} className="text-right" />
              <SortTh label="Grade" col="grade" sort={sort} dir={dir} onSort={onSort} className="text-center" />
              <SortTh label="Score" col="score" sort={sort} dir={dir} onSort={onSort} className="text-right" />
              <SortTh label="Added" col="createdAt" sort={sort} dir={dir} onSort={onSort} />
              <SortTh label="Status" col="status" sort={sort} dir={dir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/deals/${d.id}`} className="font-medium text-brand hover:underline">
                      {d.address ?? "—"}
                    </Link>
                    {reportedDealIds.has(d.id) && (
                      <span title="Included in a report" className="inline-flex h-2 w-2 rounded-full bg-brand shrink-0" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">{d.tenantName ?? "—"}</td>
                <td className="px-3 py-2">{labelFor(ASSET_TYPES, d.assetType)}</td>
                <td className="px-3 py-2 text-right">{fmtMoney(d.askingPrice)}</td>
                <td className="px-3 py-2 text-right">{fmtPercent(d.capRateAsking)}</td>
                <td className="px-3 py-2 text-right">{fmtDscr(d.dscrCalculated)}</td>
                <td className="px-3 py-2 text-center"><GradeBadge grade={d.grade} size="sm" /></td>
                <td className="px-3 py-2 text-right font-semibold">{d.score?.toFixed(0) ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-gray-400">
                  {new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                </td>
                <td className="px-3 py-2">
                  <StatusPill status={d.status === "active" ? "info" : "info"}>
                    {labelFor(DEAL_STATUSES, d.status)}
                  </StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 md:hidden">
        {filtered.map((d) => (
          <li key={d.id}>
            <Link href={`/deals/${d.id}`} className="card flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{d.address ?? "—"}</p>
                <p className="truncate text-sm text-gray-500">
                  {d.tenantName ?? "—"} · {labelFor(ASSET_TYPES, d.assetType)}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {fmtMoney(d.askingPrice)} · {fmtPercent(d.capRateAsking)} · DSCR {fmtDscr(d.dscrCalculated)}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1 pl-3">
                <GradeBadge grade={d.grade} />
                <span className="text-xs font-semibold text-gray-600">{d.score?.toFixed(0) ?? "—"}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">No deals match.</p>
      )}
    </div>
  );
}
