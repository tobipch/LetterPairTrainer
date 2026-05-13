"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/train", label: "Training" },
  { href: "/overview", label: "Übersicht" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/settings", label: "Einstellungen" },
  { href: "/admin/import", label: "CSV Import" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const currentLabel = links.find((l) => pathname.startsWith(l.href))?.label ?? "Menü";

  return (
    <>
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-14">
          <span className="font-medium text-slate-500 text-sm hidden sm:block">Letterpair Trainer</span>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(l.href)
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Mobile: current page + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{currentLabel}</span>
            <button
              onClick={() => setOpen((v) => !v)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Menü öffnen"
            >
              {open ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hidden sm:block"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden fixed inset-0 z-30 top-14" onClick={() => setOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`flex items-center px-5 py-3.5 text-sm font-medium border-b border-slate-100 dark:border-slate-700 last:border-0 ${
                  pathname.startsWith(l.href)
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-5 py-3.5 text-sm text-slate-400 hover:text-slate-600"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}
