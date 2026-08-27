"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { labelFor, SITE_TYPES, SITE_STATUSES } from "@/lib/constants";
import { GradeBadge, StatusPill } from "@/components/ui";

const PAGE_SIZE = 25;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function InitialsBadge({ name, title }: { name: string; title: string }) {
  return (
    <span
      title={title}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white shrink-0"
    >
      {initials(name)}
    </span>
  );
}

export type SiteRow = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  squareFeet: number | null;
  askingRentPsf: number | null;
  siteType: string | null;
  status: string;
  createdAt: string;
  tenantCount: number;
  bestGrade: string | null;
  tenantNames?: string[];
};

type SortKey = "name" | "address" | "siteType" | "squareFeet" | "askingRentPsf" | "bestGrade" | "tenantCount" | "createdAt" | "status";
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
      className={`px-4 py-3 cursor-pointer select-none whitespace-nowrap hover:text-foreground ${active ? "text-brand" : ""} ${className}`}
      onClick={() => onSort(col)}
    >
      {label}
      <span className="ml-1 text-[10px]">
        {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </th>
  );
}

export function SiteList({
  sites,
  reportedSiteIds = [],
}: {
  sites: SiteRow[];
  reportedSiteIds?: string[];
}) {
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [dir, setDir] = useState<SortDir>("desc");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const reported = useMemo(() => new Set(reportedSiteIds), [reportedSiteIds]);

  function onSort(col: SortKey) {
    if (sort === col) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(col);
      setDir(col === "name" || col === "address" || col === "siteType" || col === "status" ? "asc" : "desc");
    }
    setPage(1);
  }

  const sorted = useMemo(() => {
    let r = [...sites];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      r = r.filter((s) =>
        [s.name, s.address, s.city, s.state, ...(s.tenantNames ?? [])].some((v) => v?.toLowerCase().includes(q))
      );
    }
    return r.sort((a, b) => {
      let cmp = 0;
      if (sort === "bestGrade") {
        cmp = gradeNum(a.bestGrade) - gradeNum(b.bestGrade);
      } else if (sort === "createdAt") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sort === "squareFeet" || sort === "askingRentPsf" || sort === "tenantCount") {
        cmp = (a[sort] ?? -Infinity) - (b[sort] ?? -Infinity);
      } else {
        cmp = (a[sort] ?? "").toString().localeCompare((b[sort] ?? "").toString());
      }
      return dir === "asc" ? cmp : -cmp;
    });
  }, [sites, query, sort, dir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // reset page when filter shrinks results past current page

  return (
    <div className="space-y-4">
      <input
        type="search"
        className="input max-w-xs"
        placeholder="Search name, address, tenant…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setPage(1); }}
      />
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
            <SortTh label="Name" col="name" sort={sort} dir={dir} onSort={onSort} />
            <SortTh label="Address" col="address" sort={sort} dir={dir} onSort={onSort} />
            <SortTh label="Type" col="siteType" sort={sort} dir={dir} onSort={onSort} />
            <SortTh label="SF" col="squareFeet" sort={sort} dir={dir} onSort={onSort} className="text-right" />
            <SortTh label="Asking Rent/SF" col="askingRentPsf" sort={sort} dir={dir} onSort={onSort} className="text-right" />
            <SortTh label="Grade" col="bestGrade" sort={sort} dir={dir} onSort={onSort} className="text-center" />
            <SortTh label="Tenants" col="tenantCount" sort={sort} dir={dir} onSort={onSort} className="text-right" />
            <SortTh label="Added" col="createdAt" sort={sort} dir={dir} onSort={onSort} />
            <SortTh label="Status" col="status" sort={sort} dir={dir} onSort={onSort} />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {paged.map((site) => (
            <tr key={site.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-medium">
                <div className="flex items-center gap-2">
                  <Link href={`/sites/${site.id}`} className="hover:underline text-foreground">
                    {site.name}
                  </Link>
                  {reported.has(site.id) && (
                    <span title="Included in a report" className="inline-flex h-2 w-2 rounded-full bg-brand shrink-0" />
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {[site.address, site.city, site.state].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{labelFor(SITE_TYPES, site.siteType)}</td>
              <td className="px-4 py-3 text-right text-muted-foreground">
                {site.squareFeet ? site.squareFeet.toLocaleString() : "—"}
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground">
                {site.askingRentPsf ? `$${site.askingRentPsf.toFixed(2)}` : "—"}
              </td>
              <td className="px-4 py-3 text-center">
                <GradeBadge grade={site.bestGrade} size="sm" />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  {(site.tenantNames ?? []).length > 0
                    ? (site.tenantNames ?? []).map((name) => (
                        <InitialsBadge key={name} name={name} title={name} />
                      ))
                    : <span className="text-xs text-muted-foreground">{site.tenantCount || "—"}</span>
                  }
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {new Date(site.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={site.status}>{labelFor(SITE_STATUSES, site.status)}</StatusPill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1 text-sm">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
