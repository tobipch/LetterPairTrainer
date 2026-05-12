"use client";

import { useState, useEffect } from "react";
import TrainSession from "@/components/train/TrainSession";

type Mode = "daily_all" | "hard_only" | "custom";
type Direction = "lp_to_word" | "word_to_lp" | "random";

export default function TrainPage() {
  const [started, setStarted] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("daily_all");
  const [direction, setDirection] = useState<Direction>("lp_to_word");
  const [slowThresholdMs, setSlowThresholdMs] = useState(3000);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s?.directionDefault) setDirection(s.directionDefault);
        if (s?.slowThresholdMs) setSlowThresholdMs(s.slowThresholdMs);
      })
      .catch(() => {});
  }, []);

  async function start() {
    setLoading(true);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, directionSetting: direction }),
    });
    const data = await res.json();
    setSessionId(data.id);
    setStarted(true);
    setLoading(false);
  }

  if (started && sessionId) {
    return (
      <TrainSession
        mode={mode}
        direction={direction}
        sessionId={sessionId}
        slowThresholdMs={slowThresholdMs}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-6">Training starten</h1>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Modus</label>
          <div className="grid grid-cols-3 gap-2">
            {(["daily_all", "hard_only", "custom"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                  mode === m
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
                }`}
              >
                {m === "daily_all" ? "Daily All" : m === "hard_only" ? "Hard Only" : "Custom"}
              </button>
            ))}
          </div>
          {mode === "daily_all" && (
            <p className="text-xs text-slate-500 mt-1">Alle Pairs einmal, noch nicht von heute</p>
          )}
          {mode === "hard_only" && (
            <p className="text-xs text-slate-500 mt-1">Top 50 schwierigste Pairs</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Richtung</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["lp_to_word", "LP → Wort"],
              ["word_to_lp", "Wort → LP"],
              ["random", "Zufällig"],
            ] as [Direction, string][]).map(([d, label]) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                  direction === d
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={start}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-lg disabled:opacity-50"
        >
          {loading ? "..." : "Los geht's"}
        </button>
      </div>
    </div>
  );
}
