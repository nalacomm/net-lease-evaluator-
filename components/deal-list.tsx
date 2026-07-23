"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { fmtMoney, fmtPercent, fmtDscr } from "@/lib/format";
import {
  labelFor,
  ASSET_TYPES,
  DEAL_STATUSES,
} from "@/lib/constants";
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

type SortKey = "score" | "capRateAsking" | "askingPrice" | "grade";

export function DealList({ deals }: { deals: DealRow[] }) {
  const [sort, setSort] = useState<SortKey>("score");
  const [assetFilter, setAssetFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Derive unique states from deal data
  const stateOptions = useMemo(() => {
    const set = new Set(deals.map((d) => d.state).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [deals]);

  const filtered = useMemo(() => {
    let r = [...deals];
    if (assetFilter) r = r.filter((d) => d.assetType === assetFilter);
    if (statusFilter) r = r.filter((d) => d.status === statusFilter);
    if (gradeFilter) r = r.filter((d) => d.grade === gradeFilter);
    if (stateFilter) r = r.filter((d) => d.state === stateFilter);
    if (priceMin) r = r.filter((d) => d.askingPrice != null && d.askingPrice >= Number(priceMin));
    if (priceMax) r = r.filter((d) => d.askingPrice != null && d.askingPrice <= Number(priceMax));
    r.sort((a, b) => {
      const av = (a[sort] ?? -Infinity) as number | string;
      const bv = (b[sort] ?? -Infinity) as number | string;
      if (sort === "grade") return String(av).localeCompare(String(bv));
      return (bv as number) - (av as number);
    });
    return r;
  }, [deals, sort, assetFilter, statusFilter, gradeFilter, stateFilter, priceMin, priceMax]);

  const activeFilters = [assetFilter, statusFilter, gradeFilter, stateFilter, priceMin, priceMax].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Primary controls row */}
      <div className="flex flex-wrap items-center gap-2">
        <select className="input flex-1 min-w-[140px]" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="score">Sort: Score</option>
          <option value="capRateAsking">Sort: Cap Rate</option>
          <option value="askingPrice">Sort: Price</option>
          <option value="grade">Sort: Grade</option>
        </select>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`btn-secondary gap-1 ${activeFilters > 0 ? "border-brand text-brand" : ""}`}
        >
          Filters {activeFilters > 0 && <span className="rounded-full bg-brand px-1.5 text-xs text-white">{activeFilters}</span>}
        </button>
      </div>

      {/* Expanded filters */}
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
              <th className="px-3 py-2">Address</th>
              <th className="px-3 py-2">Tenant</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">Cap</th>
              <th className="px-3 py-2 text-right">DSCR</th>
              <th className="px-3 py-2 text-center">Grade</th>
              <th className="px-3 py-2 text-right">Score</th>
              <th className="px-3 py-2">Added</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2">
                  <Link href={`/deals/${d.id}`} className="font-medium text-brand hover:underline">
                    {d.address ?? "—"}
                  </Link>
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
