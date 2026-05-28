"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Passwörter stimmen nicht überein");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Zurücksetzen");
        return;
      }
      setSuccess(true);
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

        {success ? (
          <div className="text-center space-y-4">
            <p className="text-green-600 font-medium">Passwort erfolgreich geändert!</p>
            <Link
              href="/login"
              className="block w-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-medium py-2.5 rounded-lg text-center"
            >
              Zum Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-slate-600 dark:text-slate-400 text-sm text-center mb-2">
              Neues Passwort setzen
            </p>
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
              placeholder="Neues Passwort"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
              required
            />
            <input
              type="password"
              placeholder="Passwort bestätigen"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
              {loading ? "…" : "Passwort ändern"}
            </button>
            <Link
              href="/login"
              className="block text-center text-slate-400 text-xs hover:text-slate-600 pt-1"
            >
              Zurück zum Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
