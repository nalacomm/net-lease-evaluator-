export function fmtMoney(v: number | null | undefined, dp = 0): string {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: dp,
    minimumFractionDigits: dp,
  }).format(v);
}

export function fmtMoneyShort(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return "—";
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return fmtMoney(v);
}

export function fmtPercent(
  v: number | null | undefined,
  dp = 2,
  alreadyPercent = true
): string {
  if (v === null || v === undefined || isNaN(v)) return "—";
  const val = alreadyPercent ? v : v * 100;
  return `${val.toFixed(dp)}%`;
}

export function fmtDscr(v: number | null | undefined): string {
  if (v === null || v === undefined) return "All Cash";
  if (isNaN(v)) return "—";
  return `${v.toFixed(2)}x`;
}

export const GRADE_COLORS: Record<string, string> = {
  A: "bg-grade-a text-white",
  B: "bg-grade-b text-white",
  C: "bg-grade-c text-white",
  D: "bg-grade-d text-white",
  F: "bg-grade-f text-white",
};

export const STATUS_COLORS: Record<string, string> = {
  pass: "bg-green-100 text-green-800 border-green-200",
  warn: "bg-yellow-100 text-yellow-800 border-yellow-200",
  fail: "bg-red-100 text-red-800 border-red-200",
  info: "bg-gray-100 text-gray-700 border-gray-200",
};
