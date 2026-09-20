"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { cn } from "@/lib/cn";

const links = [
  { href: "/analyze", label: "Analyze" },
  { href: "/insights", label: "Safety Insights" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/80 bg-white/80 backdrop-blur">
      <div className="container-wide flex h-16 items-center justify-between">
        <Link href="/" aria-label="Veridra home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-ink-100 text-ink-900"
                    : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
                )}
              >
                {l.label}
              </Link>
            );
          })}
          <Link href="/analyze" className="btn-brand ml-2 hidden sm:inline-flex">
            Analyze content
          </Link>
        </nav>
      </div>
    </header>
  );
}
