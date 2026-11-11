"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgePlus, ChartPie, House, Landmark, ReceiptText, Settings, ShieldCheck, TrendingUp, type LucideIcon } from "lucide-react";
import { cx } from "./ui";

type Item = { href: string; label: string; icon: LucideIcon; mobile?: boolean };

const ITEMS: Item[] = [
  { href: "/overview", label: "Overview", icon: House, mobile: true },
  { href: "/spending", label: "Spending", icon: ReceiptText, mobile: true },
  { href: "/portfolio", label: "Portfolio", icon: ChartPie, mobile: true },
  { href: "/markets", label: "Markets", icon: TrendingUp, mobile: true },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/settings", label: "Settings", icon: Settings, mobile: true },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function SideNav({ plus, admin }: { plus: boolean; admin: boolean }) {
  const pathname = usePathname();
  const items: Item[] = [
    ...ITEMS,
    ...(plus ? [] : [{ href: "/plus", label: "Get Plus", icon: BadgePlus }]),
    ...(admin ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex h-10 items-center gap-3 rounded-control px-3 text-[14.5px] transition-colors",
              active ? "bg-brand-soft font-medium text-brand-ink" : "text-ink-2 hover:bg-sunken hover:text-ink",
            )}
          >
            <Icon size={18} strokeWidth={active ? 2.1 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="no-print safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.filter((item) => item.mobile).map(({ href, label, icon: Icon }) => {
          const active =
            isActive(pathname, href) ||
            (href === "/settings" && ["/accounts", "/plus", "/admin"].some((path) => isActive(pathname, path)));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-[58px] flex-col items-center justify-center gap-1 text-[11px]",
                  active ? "font-medium text-brand-ink" : "text-ink-3",
                )}
              >
                <Icon size={21} strokeWidth={active ? 2.1 : 1.7} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
