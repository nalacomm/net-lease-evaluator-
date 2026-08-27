"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { fmtMoney } from "@/lib/format";

type InvestorRow = {
  id: string;
  name: string;
  entityName: string | null;
  _count: { deals: number };
  buyBox: {
    capRateMin: number;
    priceMax: number;
    assetTypesPreferred: string[];
  } | null;
};

export function InvestorList({ investors }: { investors: InvestorRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return investors;
    const q = query.trim().toLowerCase();
    return investors.filter((inv) =>
      [inv.name, inv.entityName].some((v) => v?.toLowerCase().includes(q))
    );
  }, [investors, query]);

  return (
    <div className="space-y-3">
      <input
        type="search"
        className="input max-w-xs"
        placeholder="Search name or entity…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="space-y-2">
        {filtered.map((inv) => (
          <li key={inv.id}>
            <Link href={`/investors/${inv.id}`} className="card flex items-center justify-between hover:bg-gray-50">
              <div>
                <p className="font-semibold text-gray-900">{inv.name}</p>
                <p className="text-sm text-gray-500">
                  {inv.entityName ?? "—"} · {inv._count.deals} deals
                </p>
                {inv.buyBox && (
                  <p className="mt-1 text-xs text-gray-400">
                    Cap floor {inv.buyBox.capRateMin}% · Max{" "}
                    {fmtMoney(inv.buyBox.priceMax)} ·{" "}
                    {inv.buyBox.assetTypesPreferred.join(", ")}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-sm text-gray-400 py-4 text-center">No investors match &ldquo;{query}&rdquo;</li>
        )}
      </ul>
    </div>
  );
}
