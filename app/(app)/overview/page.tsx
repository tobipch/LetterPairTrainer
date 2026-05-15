"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { displayPair } from "@/lib/pairs";
import { interpolateColor } from "@/lib/colors";


interface PairWithStats {
  id: number;
  pair: string;
  word: string;
  description: string | null;
  imageUrl: string | null;
  updatedAt: string;
  stats: {
    total: number;
    instantCount: number;
    slowCount: number;
    failCount: number;
    instantRate: number;
    slowRate: number;
    failRate: number;
    avgDurationMs: number | null;
    difficultyScore: number;
    lastReviewAt: string | null;
  };
}

type SortKey = "pair" | "word" | "total" | "instantRate" | "slowRate" | "failRate" | "avgDurationMs" | "lastReviewAt" | "difficultyScore";

export default function OverviewPage() {
  const [pairs, setPairs] = useState<PairWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("pair");
  const [sortAsc, setSortAsc] = useState(true);
  const [editingPair, setEditingPair] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/letterpairs");
    const data = await res.json();
    setPairs(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  async function saveWord(pair: string, word: string) {
    await fetch(`/api/letterpairs/${pair}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word }),
    });
    setPairs((prev) =>
      prev.map((p) => (p.pair === pair ? { ...p, word } : p))
    );
    setEditingPair(null);
  }

  const filtered = pairs
    .filter((p) => {
      const q = search.toLowerCase();
      return (
        p.pair.toLowerCase().includes(q) ||
        p.word.toLowerCase().includes(q) ||
        displayPair(p.pair).toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let av: unknown = a[sortKey as keyof PairWithStats];
      let bv: unknown = b[sortKey as keyof PairWithStats];
      if (sortKey in a.stats) {
        av = a.stats[sortKey as keyof typeof a.stats];
        bv = b.stats[sortKey as keyof typeof b.stats];
      }
      if (av == null && bv == null) return 0;
      if (av == null) return sortAsc ? 1 : -1;
      if (bv == null) return sortAsc ? -1 : 1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av;
      }
      return 0;
    });

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    return (
      <th
        onClick={() => toggleSort(k)}
        className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300 whitespace-nowrap"
      >
        {label}
        {sortKey === k && (
          <span className="ml-1">{sortAsc ? "↑" : "↓"}</span>
        )}
      </th>
    );
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Lade…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4">
        <h1 className="text-2xl font-bold">Übersicht ({pairs.length} Pairs)</h1>
        <input
          type="text"
          placeholder="Suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
        />
      </div>

      <div className="overflow-x-auto rounded-xl shadow">
        <table className="w-full bg-white dark:bg-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <SortHeader label="Pair" k="pair" />
              <SortHeader label="Wort" k="word" />
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap" title="Beschreibung / Bild">Info</th>
              <SortHeader label="Reviews" k="total" />
              <SortHeader label="Sofort%" k="instantRate" />
              <SortHeader label="Unsicher%" k="slowRate" />
              <SortHeader label="Fail%" k="failRate" />
              <SortHeader label="Ø Zeit" k="avgDurationMs" />
              <SortHeader label="Letzte Review" k="lastReviewAt" />
              <SortHeader label="Difficulty" k="difficultyScore" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map((p) => {
              const color = interpolateColor(p.stats.difficultyScore);
              return (
                <tr key={p.pair} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-3 py-2 font-mono font-bold">
                    <Link href={`/pair/${p.pair}`} className="hover:text-blue-600 hover:underline">
                      {displayPair(p.pair)}
                    </Link>
                  </td>
                  <td
                    className="px-3 py-2 cursor-text"
                    onDoubleClick={() => {
                      setEditingPair(p.pair);
                      setEditValue(p.word);
                    }}
                  >
                    {editingPair === p.pair ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveWord(p.pair, editValue);
                          if (e.key === "Escape") setEditingPair(null);
                        }}
                        onBlur={() => setEditingPair(null)}
                        className="border border-blue-400 rounded px-2 py-0.5 text-sm focus:outline-none w-full"
                      />
                    ) : (
                      <span title="Doppelklick zum Bearbeiten">{p.word}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5 items-center">
                      <span title={p.description ? "Hat Beschreibung" : "Keine Beschreibung"} className={`text-sm ${p.description ? "opacity-100" : "opacity-20"}`}>📝</span>
                      <span title={p.imageUrl ? "Hat Bild" : "Kein Bild"} className={`text-sm ${p.imageUrl ? "opacity-100" : "opacity-20"}`}>🖼</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">{p.stats.total}</td>
                  <td className="px-3 py-2 text-center text-green-600">
                    {p.stats.total > 0 ? `${(p.stats.instantRate * 100).toFixed(0)}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-center text-yellow-600" title="Unsicher">
                    {p.stats.total > 0 ? `${(p.stats.slowRate * 100).toFixed(0)}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-center text-red-600">
                    {p.stats.total > 0 ? `${(p.stats.failRate * 100).toFixed(0)}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {p.stats.avgDurationMs != null
                      ? `${(p.stats.avgDurationMs / 1000).toFixed(1)}s`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-xs">
                    {p.stats.lastReviewAt
                      ? new Date(p.stats.lastReviewAt).toLocaleDateString("de-DE")
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-mono">
                        {p.stats.difficultyScore.toFixed(2)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
