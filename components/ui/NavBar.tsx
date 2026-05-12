"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
      <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <span className="font-bold text-blue-600 mr-4 text-sm hidden sm:block">3BLD Trainer</span>
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
        <button
          onClick={handleLogout}
          className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
