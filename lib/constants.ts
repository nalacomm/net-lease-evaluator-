export const ASSET_TYPES: { value: string; label: string }[] = [
  { value: "eclc", label: "ECLC / Early Childhood" },
  { value: "qsr", label: "QSR" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "medical", label: "Medical" },
  { value: "retail", label: "Retail" },
  { value: "shopping_center", label: "Shopping Center" },
  { value: "restaurant", label: "Restaurant" },
  { value: "other", label: "Other" },
];

// Fields specific to shopping centers shown in intake + deal profile
export const SHOPPING_CENTER_FIELDS = [
  { key: "numberOfTenants", label: "Number of Tenants", type: "number" },
  { key: "anchorTenant", label: "Anchor Tenant", type: "text" },
  { key: "vacancyRate", label: "Vacancy Rate (%)", type: "number" },
  { key: "grossLeasableArea", label: "Gross Leasable Area (SF)", type: "number" },
] as const;

export const LEASE_TYPES: { value: string; label: string }[] = [
  { value: "absolute_nnn", label: "Absolute NNN" },
  { value: "nnn", label: "NNN" },
  { value: "modified_nnn", label: "Modified NNN" },
  { value: "gross", label: "Gross" },
];

export const GUARANTY_TYPES: { value: string; label: string }[] = [
  { value: "corporate", label: "Corporate" },
  { value: "multi_unit_franchisee", label: "Multi-Unit Franchisee" },
  { value: "single_personal", label: "Single / Personal" },
];

export const DEAL_STATUSES: { value: string; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "passed", label: "Passed" },
  { value: "under_loi", label: "Under LOI" },
  { value: "closed", label: "Closed" },
  { value: "dead", label: "Dead" },
];

export const SOURCE_PLATFORMS: { value: string; label: string }[] = [
  { value: "costar", label: "CoStar" },
  { value: "loopnet", label: "LoopNet" },
  { value: "crexi", label: "Crexi" },
  { value: "direct", label: "Direct" },
  { value: "other", label: "Other" },
];

export const NEWS_CATEGORIES: { value: string; label: string }[] = [
  { value: "interest_rates", label: "Interest Rates" },
  { value: "cap_rates", label: "Cap Rates" },
  { value: "tenant_credit", label: "Tenant Credit" },
  { value: "sector_news", label: "Sector News" },
  { value: "market", label: "Market" },
];

export function labelFor(
  list: { value: string; label: string }[],
  value?: string | null
): string {
  if (!value) return "—";
  return list.find((x) => x.value === value)?.label ?? value;
}
