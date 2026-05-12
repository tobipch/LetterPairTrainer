"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { displayLetter } from "@/lib/pairs";
import { interpolateColor } from "@/lib/colors";

interface PairWithStats {
  pair: string;
  word: string;
  stats: {
    total: number;
    difficultyScore: number;
    instantRate: number;
    slowRate: number;
    failRate: number;
    avgDurationMs: number | null;
  };
}

export default function HeatmapPage() {
  const [pairs, setPairs] = useState<PairWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ pair: PairWithStats; x: number; y: number } | null>(null);
  const [letters, setLetters] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/letterpairs")
      .then((r) => r.json())
      .then((data: PairWithStats[]) => {
        setPairs(data);
        // Derive letter set from pairs
        const set = new Set<string>();
        for (const p of data) {
          if (p.pair.length >= 2) {
            set.add(p.pair[0]);
            set.add(p.pair[1]);
          }
        }
        setLetters([...set].sort());
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Lade…</div>;

  const pairMap = new Map(pairs.map((p) => [p.pair, p]));

  return (
    <div className="relative">
      <h1 className="text-2xl font-bold mb-4">Heatmap</h1>
      <p className="text-sm text-slate-500 mb-4">
        Spalte = 1. Buchstabe, Zeile = 2. Buchstabe. Farbe = Difficulty (grün → rot)
      </p>

      <div className="overflow-x-auto">
        <table className="border-collapse text-xs font-mono">
          <thead>
            <tr>
              <th className="w-10 h-8" />
              {letters.map((col) => (
                <th key={col} className="w-10 h-8 text-center text-slate-500 font-semibold">
                  {displayLetter(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {letters.map((row) => (
              <tr key={row}>
                <td className="w-10 h-8 text-center text-slate-500 font-semibold pr-1">
                  {displayLetter(row)}
                </td>
                {letters.map((col) => {
                  const key = `${col}${row}`;
                  const p = pairMap.get(key);
                  if (!p) {
                    return (
                      <td key={col} className="w-8 h-8 bg-slate-100 dark:bg-slate-800" />
                    );
                  }
                  const color = interpolateColor(p.stats.difficultyScore);
                  return (
                    <td key={col} className="w-8 h-8 p-0">
                      <Link href={`/pair/${p.pair}`}>
                        <div
                          className="w-full h-full flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-400 hover:z-10 relative rounded-sm text-[9px] font-bold"
                          style={{ backgroundColor: color, color: p.stats.difficultyScore > 0.5 ? "#fff" : "#1e293b" }}
                          onMouseEnter={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setTooltip({ pair: p, x: rect.left + window.scrollX, y: rect.top + window.scrollY });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                          title={`${p.pair}: ${p.word}`}
                        >
                          {p.pair}
                        </div>
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-800 shadow-xl rounded-xl p-3 text-sm pointer-events-none border border-slate-200 dark:border-slate-600"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="font-bold text-base">{tooltip.pair.pair}</div>
          <div className="text-blue-600">{tooltip.pair.word}</div>
          {tooltip.pair.stats.total > 0 ? (
            <>
              <div className="text-slate-500 mt-1">Reviews: {tooltip.pair.stats.total}</div>
              <div className="text-green-600">Sofort: {(tooltip.pair.stats.instantRate * 100).toFixed(0)}%</div>
              <div className="text-yellow-600">Langsam: {(tooltip.pair.stats.slowRate * 100).toFixed(0)}%</div>
              <div className="text-red-600">Fail: {(tooltip.pair.stats.failRate * 100).toFixed(0)}%</div>
              {tooltip.pair.stats.avgDurationMs && (
                <div className="text-slate-500">Ø {(tooltip.pair.stats.avgDurationMs / 1000).toFixed(1)}s</div>
              )}
            </>
          ) : (
            <div className="text-slate-400 mt-1">Noch nicht trainiert</div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex items-center gap-3 text-xs text-slate-500">
        <span>Leicht</span>
        <div className="flex h-4 w-32 rounded overflow-hidden">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: interpolateColor(i / 19) }} />
          ))}
        </div>
        <span>Schwer</span>
      </div>
    </div>
  );
}
