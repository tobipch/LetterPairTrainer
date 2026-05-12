"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface ActiveSession {
  id: number;
  mode: string;
  directionSetting: string;
  startedAt: string;
}

interface OverviewStats {
  totalCount: number;
  todayDone: number;
  streak: number;
  weekSuccessRate: number | null;
  avgDurationMs: number | null;
  activeSession: ActiveSession | null;
  dailyAllDoneToday: boolean;
  dailyWord: {
    pair: string;
    word: string;
    description: string | null;
    imageUrl: string | null;
  } | null;
  dailyWordDone: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyDesc, setDailyDesc] = useState("");
  const [savingDaily, setSavingDaily] = useState(false);
  const [uploadingDaily, setUploadingDaily] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch("/api/stats/overview");
    const data = await res.json();
    setStats(data);
    if (data.dailyWord?.description) setDailyDesc(data.dailyWord.description);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveDailyDesc() {
    if (!stats?.dailyWord) return;
    setSavingDaily(true);
    await fetch(`/api/letterpairs/${stats.dailyWord.pair}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: dailyDesc }),
    });
    await load();
    setSavingDaily(false);
  }

  async function uploadDailyImage(file: File) {
    if (!stats?.dailyWord) return;
    setUploadingDaily(true);
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`/api/letterpairs/${stats.dailyWord.pair}/image`, {
      method: "POST",
      body: formData,
    });
    await load();
    setUploadingDaily(false);
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Lade…</div>;
  if (!stats) return null;

  const progressPct = stats.totalCount > 0 ? (stats.todayDone / stats.totalCount) * 100 : 0;
  const { activeSession, dailyAllDoneToday } = stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Willkommen zurück! Trainiere deine Letterpairs.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Heute trainiert"
          value={`${stats.todayDone} / ${stats.totalCount}`}
          sub={`${progressPct.toFixed(0)}%`}
          color="text-blue-600"
        />
        <StatCard
          label="Streak"
          value={`${stats.streak} 🔥`}
          sub="Tage in Folge"
          color="text-orange-500"
        />
        <StatCard
          label="Erfolgsrate 7 Tage"
          value={stats.weekSuccessRate != null ? `${(stats.weekSuccessRate * 100).toFixed(0)}%` : "—"}
          color="text-green-600"
        />
        <StatCard
          label="Ø Zeit 7 Tage"
          value={stats.avgDurationMs != null ? `${(stats.avgDurationMs / 1000).toFixed(1)}s` : "—"}
          color="text-slate-600"
        />
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Tagesfortschritt</span>
          <span>{stats.todayDone} / {stats.totalCount}</span>
        </div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {dailyAllDoneToday ? (
          <div className="bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 font-semibold py-4 rounded-xl text-center text-lg cursor-not-allowed select-none">
            Daily All ✓
          </div>
        ) : activeSession ? (
          <Link
            href={`/train?continue=${activeSession.id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl text-center text-lg"
          >
            Daily All fortfahren
          </Link>
        ) : (
          <Link
            href="/train?mode=daily_all"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl text-center text-lg"
          >
            Daily All starten
          </Link>
        )}
        <Link
          href="/train?mode=hard_only"
          className="bg-red-500 hover:bg-red-600 text-white font-semibold py-4 rounded-xl text-center text-lg"
        >
          Hard Only starten
        </Link>
        <Link
          href="/train"
          className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-semibold py-4 rounded-xl text-center text-lg"
        >
          Custom
        </Link>
      </div>

      {/* Daily Word */}
      {stats.dailyWord && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-6">
          <h2 className="font-bold text-lg mb-1">Wort des Tages</h2>

          {stats.dailyWordDone ? (
            // Already filled in — show completed state
            <div className="flex items-start gap-4 mt-3">
              {stats.dailyWord.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={stats.dailyWord.imageUrl}
                  alt={stats.dailyWord.word}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                />
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-bold font-mono">{stats.dailyWord.pair}</span>
                  <span className="text-lg text-blue-600 font-semibold">{stats.dailyWord.word}</span>
                  <span className="text-green-600 text-sm font-semibold">✓ Erledigt</span>
                </div>
                {stats.dailyWord.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">{stats.dailyWord.description}</p>
                )}
                <Link href={`/pair/${stats.dailyWord.pair}`} className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                  Details ansehen
                </Link>
              </div>
            </div>
          ) : (
            // Not yet filled in
            <>
              <p className="text-sm text-slate-500 mb-4">Beschreibe dieses Wort und füge ein Bild hinzu</p>
              <div className="flex items-start gap-4">
                {stats.dailyWord.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={stats.dailyWord.imageUrl}
                    alt={stats.dailyWord.word}
                    className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-24 h-24 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 text-xs text-center cursor-pointer hover:bg-slate-200 flex-shrink-0 whitespace-pre"
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploadingDaily ? "…" : "Bild\nhochladen"}
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <span className="text-2xl font-bold font-mono">{stats.dailyWord.pair}</span>
                    <span className="ml-3 text-xl text-blue-600 font-semibold">{stats.dailyWord.word}</span>
                  </div>
                  <textarea
                    value={dailyDesc}
                    onChange={(e) => setDailyDesc(e.target.value)}
                    placeholder="Beschreibe das Wort (Aussehen, Geschichte, Eselsbrücke…)"
                    rows={3}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={saveDailyDesc}
                      disabled={savingDaily || !dailyDesc.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {savingDaily ? "Speichere…" : "Beschreibung speichern"}
                    </button>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploadingDaily}
                      className="border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                      {uploadingDaily ? "Wird hochgeladen…" : "Bild hochladen"}
                    </button>
                    <Link
                      href={`/pair/${stats.dailyWord.pair}`}
                      className="border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadDailyImage(file);
            }}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color ?? ""}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
