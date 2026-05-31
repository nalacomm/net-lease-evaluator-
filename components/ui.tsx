import clsx from "clsx";
import Link from "next/link";
import { GRADE_COLORS, STATUS_COLORS } from "@/lib/format";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function GradeBadge({
  grade,
  size = "md",
}: {
  grade?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  if (!grade) return <span className="text-gray-400">—</span>;
  const cls = GRADE_COLORS[grade] ?? "bg-gray-400 text-white";
  const sz =
    size === "lg"
      ? "h-12 w-12 text-2xl"
      : size === "sm"
      ? "h-6 w-6 text-xs"
      : "h-8 w-8 text-sm";
  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center rounded-lg font-bold",
        cls,
        sz
      )}
    >
      {grade}
    </span>
  );
}

export function StatusPill({
  status,
  children,
}: {
  status: string;
  children: React.ReactNode;
}) {
  const cls = STATUS_COLORS[status] ?? STATUS_COLORS.info;
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        cls
      )}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center py-12 text-center">
      <p className="font-medium text-gray-700">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={variant === "primary" ? "btn-primary" : "btn-secondary"}
    >
      {children}
    </Link>
  );
}
