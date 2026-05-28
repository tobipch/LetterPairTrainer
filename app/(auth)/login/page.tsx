"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Login fehlgeschlagen");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-xs px-4">
        <p className="text-center text-slate-400 text-sm mb-8 tracking-wide uppercase">
          Letterpair Trainer
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
            autoFocus
            required
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
            required
          />
          {error && (
            <p className="text-red-500 text-xs text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-40 mt-1"
          >
            {loading ? "…" : "Einloggen"}
          </button>
          <Link
            href="/reset-password"
            className="block text-center text-slate-400 text-xs hover:text-slate-600 pt-1"
          >
            Passwort vergessen?
          </Link>
        </form>
      </div>
    </div>
  );
}
