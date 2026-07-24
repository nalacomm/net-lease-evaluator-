"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { labelFor, SITE_TYPES, SITE_STATUSES } from "@/lib/constants";
import { GradeBadge, StatusPill } from "@/components/ui";

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
  const reported = useMemo(() => new Set(reportedSiteIds), [reportedSiteIds]);

  function onSort(col: SortKey) {
    if (sort === col) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(col);
      setDir(col === "name" || col === "address" || col === "siteType" || col === "status" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    return [...sites].sort((a, b) => {
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
  }, [sites, sort, dir]);

  return (
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
          {sorted.map((site) => (
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
              <td className="px-4 py-3 text-right">{site.tenantCount}</td>
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
  );
}
