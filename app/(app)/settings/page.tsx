"use client";

import { useState, useEffect } from "react";

interface Settings {
  directionDefault: "lp_to_word" | "word_to_lp" | "random";
  slowThresholdMs: number;
  hardOnlyCount: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    directionDefault: "lp_to_word",
    slowThresholdMs: 3000,
    hardOnlyCount: 50,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s) setSettings(s);
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directionDefault: settings.directionDefault,
        slowThresholdMs: settings.slowThresholdMs,
        hardOnlyCount: settings.hardOnlyCount,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function savePassword() {
    if (!newPassword || newPassword.length < 6) return;
    setPwSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    setPwSaving(false);
    setPwSaved(true);
    setNewPassword("");
    setTimeout(() => setPwSaved(false), 2000);
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Lade…</div>;

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Einstellungen</h1>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-6 space-y-5">
        <h2 className="font-semibold">Training</h2>

        <div>
          <label className="block text-sm font-medium mb-2">Standard-Richtung</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["lp_to_word", "LP → Wort"],
              ["word_to_lp", "Wort → LP"],
              ["random", "Zufällig"],
            ] as [Settings["directionDefault"], string][]).map(([d, label]) => (
              <button
                key={d}
                onClick={() => setSettings((s) => ({ ...s, directionDefault: d }))}
                className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                  settings.directionDefault === d
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Slow-Schwellwert: <span className="text-blue-600">{(settings.slowThresholdMs / 1000).toFixed(1)}s</span>
          </label>
          <input
            type="range"
            min={500}
            max={10000}
            step={100}
            value={settings.slowThresholdMs}
            onChange={(e) => setSettings((s) => ({ ...s, slowThresholdMs: parseInt(e.target.value) }))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0.5s</span>
            <span>10s</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ab dieser Zeit wird der "Unsicher"-Button hervorgehoben
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Hard Only Pairs: <span className="text-blue-600">{settings.hardOnlyCount}</span>
          </label>
          <input
            type="range"
            min={5}
            max={300}
            step={5}
            value={settings.hardOnlyCount}
            onChange={(e) => setSettings((s) => ({ ...s, hardOnlyCount: parseInt(e.target.value) }))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>5</span>
            <span>300</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Anzahl der schwierigsten Pairs im Hard-Only-Modus
          </p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50"
        >
          {saved ? "Gespeichert ✓" : saving ? "…" : "Speichern"}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-6 space-y-4">
        <h2 className="font-semibold">Passwort ändern</h2>
        <input
          type="password"
          placeholder="Neues Passwort (min. 6 Zeichen)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={savePassword}
          disabled={pwSaving || newPassword.length < 6}
          className="w-full bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50"
        >
          {pwSaved ? "Gespeichert ✓" : pwSaving ? "…" : "Passwort ändern"}
        </button>
      </div>
    </div>
  );
}
