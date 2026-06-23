"use client";

import { useRouter } from "next/navigation";

export function InvestorSwitcher({
  investors,
  activeId,
}: {
  investors: { id: string; name: string }[];
  activeId: string;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Viewing:</label>
      <select
        className="input max-w-xs"
        value={activeId}
        onChange={(e) => router.push(`/?investor=${e.target.value}`)}
      >
        {investors.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TenantSwitcher({
  tenants,
  activeId,
  extraParam,
}: {
  tenants: { id: string; name: string }[];
  activeId: string | null;
  extraParam?: string;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Viewing:</label>
      <select
        className="input max-w-xs"
        value={activeId ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          const base = val ? `/?tenant=${val}` : "/";
          router.push(extraParam ? `${base}${val ? "&" : "?"}${extraParam}` : base);
        }}
      >
        <option value="">All Tenants</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
