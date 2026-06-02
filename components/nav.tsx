"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Newspaper,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import clsx from "clsx";

const TABS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/deals", label: "Deals", icon: Building2 },
  { href: "/investors", label: "Investors", icon: Users },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-gray-200 md:bg-white print:!hidden">
      <div className="flex h-16 items-center px-5">
        <span className="text-lg font-bold text-brand">Net Lease</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = isActive(pathname, t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={clsx(
                "flex min-h-touch items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                active
                  ? "bg-brand text-white"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="m-3 flex min-h-touch items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
      >
        <LogOut className="h-5 w-5" />
        Sign out
      </button>
    </aside>
  );
}

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-gray-200 bg-white md:hidden print:!hidden">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = isActive(pathname, t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={clsx(
              "flex min-h-touch flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
              active ? "text-brand" : "text-gray-500"
            )}
          >
            <Icon className={clsx("h-5 w-5", active && "text-brand")} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
