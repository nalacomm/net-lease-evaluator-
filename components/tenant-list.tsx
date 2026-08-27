"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Building2 } from "lucide-react";

type TenantRow = {
  id: string;
  name: string;
  company: string | null;
  _count: { siteAssignments: number };
  requirements: {
    minSF: number | null;
    maxSF: number | null;
    targetMarkets: string[];
  } | null;
};

export function TenantList({ tenants }: { tenants: TenantRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return tenants;
    const q = query.trim().toLowerCase();
    return tenants.filter((t) =>
      [t.name, t.company, ...(t.requirements?.targetMarkets ?? [])].some((v) => v?.toLowerCase().includes(q))
    );
  }, [tenants, query]);

  return (
    <div className="space-y-4">
      <input
        type="search"
        className="input max-w-xs"
        placeholder="Search name, company, market…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((tenant) => {
          const req = tenant.requirements;
          const markets = req?.targetMarkets ?? [];
          const sfMin = req?.minSF;
          const sfMax = req?.maxSF;
          const sfLabel =
            sfMin || sfMax
              ? [sfMin && `${sfMin.toLocaleString()} SF`, sfMax && `${sfMax.toLocaleString()} SF`]
                  .filter(Boolean)
                  .join(" – ")
              : null;

          return (
            <Link
              key={tenant.id}
              href={`/tenants/${tenant.id}`}
              className="card flex flex-col justify-between gap-3 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{tenant.name}</p>
                  {tenant.company && (
                    <p className="text-sm text-gray-500">{tenant.company}</p>
                  )}
                </div>
                <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
              </div>

              <div className="space-y-1 text-xs text-gray-500">
                {sfLabel && (
                  <p className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {sfLabel}
                  </p>
                )}
                {markets.length > 0 && (
                  <p className="truncate">
                    {markets.slice(0, 3).join(", ")}
                    {markets.length > 3 && ` +${markets.length - 3} more`}
                  </p>
                )}
                <p className="font-medium text-gray-600">
                  {tenant._count.siteAssignments} site
                  {tenant._count.siteAssignments !== 1 ? "s" : ""} assigned
                </p>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full text-sm text-gray-400 py-4 text-center">No tenants match &ldquo;{query}&rdquo;</p>
        )}
      </div>
    </div>
  );
}
