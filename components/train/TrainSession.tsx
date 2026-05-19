"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import ConfusionDialog, { ConfusionResult } from "./ConfusionDialog";
import { displayPair } from "@/lib/pairs";

interface Pair {
  id: number;
  pair: string;
  word: string;
  description?: string | null;
  imageUrl?: string | null;
}

interface SessionResult {
  pair: Pair;
  result: "instant" | "slow" | "fail";
  durationMs: number | null;
  discarded: boolean;
}

interface Props {
  mode: "daily_all" | "hard_only" | "custom";
  direction: "lp_to_word" | "word_to_lp" | "random";
  sessionId: number;
  slowThresholdMs: number;
  hardOnlyCount?: number;
}

type Phase = "thinking" | "rating" | "done";

export default function TrainSession({ mode, direction, sessionId, slowThresholdMs, hardOnlyCount = 50 }: Props) {
  const [current, setCurrent] = useState<Pair | null>(null);
  const [prefetched, setPrefetched] = useState<{ pair: Pair; remaining: number; total: number } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [phase, setPhase] = useState<Phase>("thinking");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [discarded, setDiscarded] = useState(false);
  const [showConfusion, setShowConfusion] = useState(false);
  const [done, setDone] = useState(false);
  const [actualDirection, setActualDirection] = useState<"lp_to_word" | "word_to_lp">("lp_to_word");
  const [initialLoading, setInitialLoading] = useState(true);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [pastWrongWords, setPastWrongWords] = useState<string[]>([]);
  const [descOpen, setDescOpen] = useState(false);

  // Re-drill state
  const [activeSessionId, setActiveSessionId] = useState(sessionId);
  const localPairPoolRef = useRef<Pair[] | null>(null);

  // Session result tracking for summary
  const sessionResultsRef = useRef<SessionResult[]>([]);

  const lastRatedRef = useRef<{
    pair: Pair;
    durationMs: number | null;
    direction: "lp_to_word" | "word_to_lp";
  } | null>(null);

  const donePairsRef = useRef<string[]>([]);
  const startRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hiddenRef = useRef(false);
  const prefetchingRef = useRef(false);

  const resolveDirection = useCallback(
    (d: "lp_to_word" | "word_to_lp" | "random"): "lp_to_word" | "word_to_lp" =>
      d === "random" ? (Math.random() < 0.5 ? "lp_to_word" : "word_to_lp") : d,
    []
  );

  const buildNextUrl = useCallback((extraExclude: string[] = []) => {
    const exclude = [...donePairsRef.current, ...extraExclude];
    const params = new URLSearchParams({ mode });
    if (exclude.length) params.set("exclude", exclude.join(","));
    if (mode === "hard_only") params.set("limit", String(hardOnlyCount));
    return `/api/sessions/next?${params}`;
  }, [mode, hardOnlyCount]);

  const prefetchNext = useCallback(async (extraExclude: string[] = []) => {
    if (prefetchingRef.current) return;
    prefetchingRef.current = true;
    try {
      // Local pool for re-drill mode
      const pool = localPairPoolRef.current;
      if (pool !== null) {
        const exclude = [...donePairsRef.current, ...extraExclude];
        const available = pool.filter((p) => !exclude.includes(p.pair));
        if (!available.length) {
          setPrefetched(null);
        } else {
          const next = available[Math.floor(Math.random() * available.length)];
          setPrefetched({ pair: next, remaining: available.length, total: pool.length });
        }
        return;
      }
      const res = await fetch(buildNextUrl(extraExclude));
      const data = await res.json();
      if (data.done || !data.pair) {
        setPrefetched(null);
      } else {
        setPrefetched({ pair: data.pair, remaining: data.remaining ?? 0, total: data.total ?? 0 });
      }
    } catch {
      setPrefetched(null);
    } finally {
      prefetchingRef.current = false;
    }
  }, [buildNextUrl]);

  async function fetchPastWrongWords(pair: string) {
    try {
      const res = await fetch(`/api/letterpairs/${pair}`);
      const data = await res.json();
      const words = (data.history ?? [])
        .filter((r: { confusionType: string; confusedWithText: string | null }) =>
          r.confusionType === "wrong_word" && r.confusedWithText
        )
        .map((r: { confusedWithText: string }) => r.confusedWithText as string)
        .reverse();
      setPastWrongWords(words);
    } catch {
      setPastWrongWords([]);
    }
  }

  function startTimer() {
    startRef.current = performance.now();
    setElapsedMs(0);
  }

  function initWithPair(pair: Pair, rem: number, tot: number) {
    setCurrent(pair);
    setRemaining(rem);
    setTotal(tot);
    setActualDirection(resolveDirection(direction));
    setPhase("thinking");
    setDiscarded(false);
    setDurationMs(null);
    setDescOpen(false);
    startTimer();
    donePairsRef.current = [pair.pair];
    prefetchNext([pair.pair]);
    fetchPastWrongWords(pair.pair);
  }

  useEffect(() => {
    async function init() {
      const res = await fetch(buildNextUrl());
      const data = await res.json();
      if (data.done || !data.pair) {
        setDone(true);
        setInitialLoading(false);
        return;
      }
      initWithPair(data.pair, data.remaining ?? 0, data.total ?? 0);
      setInitialLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "thinking") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      if (!hiddenRef.current) {
        setElapsedMs(performance.now() - startRef.current);
      } else {
        startRef.current = performance.now() - elapsedMs;
      }
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    function onVisibility() {
      hiddenRef.current = document.hidden;
      if (!document.hidden && phase === "thinking") {
        startRef.current = performance.now() - elapsedMs;
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [phase, elapsedMs]);

  function reveal() {
    if (phase !== "thinking") return;
    setDurationMs(Math.round(performance.now() - startRef.current));
    setPhase("rating");
  }

  const submitReview = useCallback(async (
    result: "instant" | "slow" | "fail",
    confusion?: ConfusionResult
  ) => {
    if (!current) return;

    const dur = discarded ? undefined : durationMs;
    const body: Record<string, unknown> = {
      pair: current.pair,
      direction: actualDirection,
      result,
      durationMs: dur,
      durationDiscarded: discarded,
      sessionId: activeSessionId,
    };
    if (confusion && confusion.type !== "skip") {
      body.confusionType = confusion.type;
      if (confusion.type === "other_pair") body.confusedWithPair = confusion.pair;
      if (confusion.type === "wrong_word") body.confusedWithText = confusion.text;
    }

    // Track for session summary
    sessionResultsRef.current.push({ pair: current, result, durationMs: dur ?? null, discarded });

    lastRatedRef.current = { pair: current, durationMs, direction: actualDirection };
    setUndoAvailable(true);

    fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});

    donePairsRef.current = [...donePairsRef.current, current.pair];

    if (prefetched) {
      const next = prefetched;
      setCurrent(next.pair);
      setRemaining(next.remaining);
      setTotal(next.total);
      setActualDirection(resolveDirection(direction));
      setPhase("thinking");
      setDiscarded(false);
      setDurationMs(null);
      setDescOpen(false);
      setPrefetched(null);
      startTimer();
      prefetchNext([next.pair.pair]);
      fetchPastWrongWords(next.pair.pair);
    } else {
      // Check local pool first
      const pool = localPairPoolRef.current;
      if (pool !== null) {
        const available = pool.filter((p) => !donePairsRef.current.includes(p.pair));
        if (!available.length) {
          setDone(true);
        } else {
          const next = available[Math.floor(Math.random() * available.length)];
          setCurrent(next);
          setRemaining(available.length - 1);
          setTotal(pool.length);
          setActualDirection(resolveDirection(direction));
          setPhase("thinking");
          setDiscarded(false);
          setDurationMs(null);
          setDescOpen(false);
          startTimer();
          donePairsRef.current = [...donePairsRef.current, next.pair];
          prefetchNext([next.pair]);
          fetchPastWrongWords(next.pair);
        }
        return;
      }

      const res = await fetch(buildNextUrl());
      const data = await res.json();
      if (data.done || !data.pair) {
        setDone(true);
      } else {
        setCurrent(data.pair);
        setRemaining(data.remaining ?? 0);
        setTotal(data.total ?? 0);
        setActualDirection(resolveDirection(direction));
        setPhase("thinking");
        setDiscarded(false);
        setDurationMs(null);
        setDescOpen(false);
        startTimer();
        donePairsRef.current = [...donePairsRef.current, data.pair.pair];
        prefetchNext([data.pair.pair]);
      }
    }
  }, [current, actualDirection, discarded, durationMs, activeSessionId, prefetched, direction, resolveDirection, prefetchNext, buildNextUrl]);

  const undoLastRating = useCallback(async () => {
    const last = lastRatedRef.current;
    if (!last || !undoAvailable) return;

    fetch(`/api/reviews/last?pair=${last.pair.pair}`, { method: "DELETE" }).catch(() => {});
    sessionResultsRef.current = sessionResultsRef.current.filter((r) => r.pair.pair !== last.pair.pair);

    donePairsRef.current = donePairsRef.current.filter((p) => p !== last.pair.pair);

    setCurrent(last.pair);
    setDurationMs(last.durationMs);
    setActualDirection(last.direction);
    setPhase("rating");
    setDiscarded(false);
    setUndoAvailable(false);
    lastRatedRef.current = null;
    fetchPastWrongWords(last.pair.pair);
  }, [undoAvailable]);

  async function startReDrill(failedPairs: Pair[]) {
    // Create a new DB session for the re-drill
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "custom", directionSetting: direction }),
    });
    const data = await res.json();
    setActiveSessionId(data.id);

    // Reset all state
    localPairPoolRef.current = failedPairs;
    sessionResultsRef.current = [];
    donePairsRef.current = [];
    lastRatedRef.current = null;
    prefetchingRef.current = false;
    setUndoAvailable(false);
    setPrefetched(null);
    setDone(false);

    const first = failedPairs[Math.floor(Math.random() * failedPairs.length)];
    donePairsRef.current = [first.pair];
    setCurrent(first);
    setRemaining(failedPairs.length - 1);
    setTotal(failedPairs.length);
    setActualDirection(resolveDirection(direction));
    setPhase("thinking");
    setDiscarded(false);
    setDurationMs(null);
    setDescOpen(false);
    startTimer();
    prefetchNext([first.pair]);
    fetchPastWrongWords(first.pair);
  }

  useEffect(() => {
    if (showConfusion) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undoLastRating(); return; }
      if (phase === "thinking" && (e.key === " " || e.key === "Enter")) { e.preventDefault(); reveal(); }
      if (phase === "rating") {
        if (e.key === "1" || e.key === "Enter") { e.preventDefault(); submitReview("instant"); }
        if (e.key === "2") { e.preventDefault(); submitReview("slow"); }
        if (e.key === "3") { e.preventDefault(); setShowConfusion(true); }
        if (e.key === "d" || e.key === "D") { e.preventDefault(); setDiscarded((v) => !v); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, showConfusion, submitReview, undoLastRating]);

  async function endSession() {
    await fetch(`/api/sessions/${activeSessionId}`, { method: "PATCH" });
    window.location.href = "/dashboard";
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (done) {
    const results = sessionResultsRef.current;
    const instantCount = results.filter((r) => r.result === "instant").length;
    const slowCount = results.filter((r) => r.result === "slow").length;
    const failCount = results.filter((r) => r.result === "fail").length;
    const durations = results.filter((r) => !r.discarded && r.durationMs != null).map((r) => r.durationMs!);
    const avgMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
    const failedPairs = results.filter((r) => r.result === "fail").map((r) => r.pair);
    const isReDrill = localPairPoolRef.current !== null;

    return (
      <div className="flex flex-col items-center gap-6 py-8 max-w-lg mx-auto">
        <div className="text-4xl">{failCount === 0 ? "🎉" : "📊"}</div>
        <h2 className="text-2xl font-bold">{isReDrill ? "Re-Drill abgeschlossen!" : "Session abgeschlossen!"}</h2>

        {/* Summary stats */}
        <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
          <h3 className="font-semibold mb-3 text-slate-600 dark:text-slate-300">Ergebnis: {results.length} Pairs</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{instantCount}</div>
              <div className="text-xs text-slate-500 mt-0.5">Sofort</div>
              <div className="text-xs text-green-600">{results.length > 0 ? Math.round((instantCount / results.length) * 100) : 0}%</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{slowCount}</div>
              <div className="text-xs text-slate-500 mt-0.5">Unsicher</div>
              <div className="text-xs text-yellow-600">{results.length > 0 ? Math.round((slowCount / results.length) * 100) : 0}%</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{failCount}</div>
              <div className="text-xs text-slate-500 mt-0.5">Fail</div>
              <div className="text-xs text-red-600">{results.length > 0 ? Math.round((failCount / results.length) * 100) : 0}%</div>
            </div>
          </div>
          {avgMs != null && (
            <p className="text-sm text-slate-500 text-center">Ø Zeit: {(avgMs / 1000).toFixed(2)}s</p>
          )}
        </div>

        {/* Failed pairs list */}
        {failedPairs.length > 0 && (
          <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
            <h3 className="font-semibold mb-3 text-red-600">Gefailte Pairs ({failedPairs.length})</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {failedPairs.map((p) => (
                <Link
                  key={p.pair}
                  href={`/pair/${p.pair}`}
                  className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm px-3 py-1.5 rounded-lg font-mono hover:bg-red-100 transition-colors"
                >
                  {p.pair} <span className="font-sans font-normal text-slate-500">{p.word}</span>
                </Link>
              ))}
            </div>
            <button
              onClick={() => startReDrill(failedPairs)}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl"
            >
              Fails nochmal trainieren ({failedPairs.length})
            </button>
          </div>
        )}

        <button
          onClick={endSession}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl"
        >
          Zum Dashboard
        </button>
      </div>
    );
  }

  const isSlowHint = phase === "rating" && !discarded && durationMs != null && durationMs > slowThresholdMs;

  return (
    <div className="flex flex-col items-center gap-6 py-8 pb-44 sm:pb-8">
      {showConfusion && (
        <ConfusionDialog
          pastWrongWords={pastWrongWords}
          onDone={(result) => {
            setShowConfusion(false);
            submitReview("fail", result);
          }}
        />
      )}

      {/* Progress */}
      <div className="text-sm text-slate-500 self-stretch flex justify-between">
        <span>
          {mode === "daily_all" ? "Daily All" : mode === "hard_only" ? "Hard Only" : "Custom"}
          {localPairPoolRef.current !== null && " · Re-Drill"}
          {" "}· {actualDirection === "lp_to_word" ? "LP → Wort" : "Wort → LP"}
        </span>
        <span>{total > 0 ? `${total - remaining + 1} / ${total}` : ""}</span>
      </div>

      {total > 0 && (
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${((total - remaining) / total) * 100}%` }}
          />
        </div>
      )}

      {/* Card */}
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 text-center min-h-[200px] flex flex-col items-center justify-center gap-4">
        {current && (
          <>
            {phase === "thinking" ? (
              <>
                <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                  {actualDirection === "lp_to_word" ? "Was ist das Wort für…" : "Welches Letterpair gehört zu…"}
                </p>
                <div className="text-5xl font-bold tracking-wider">
                  {actualDirection === "lp_to_word" ? displayPair(current.pair) : current.word}
                </div>
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">Auflösung</p>
                <div className="text-5xl font-bold tracking-wider">
                  {actualDirection === "lp_to_word" ? displayPair(current.pair) : current.word}
                </div>
                <div className="text-2xl text-blue-600 font-semibold">
                  {actualDirection === "lp_to_word" ? current.word : displayPair(current.pair)}
                </div>
                {/* Image slot — always reserved to prevent layout shift */}
                <div className="w-full flex items-center justify-center h-32">
                  {current.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={current.imageUrl} alt={current.word} className="max-h-32 rounded-lg object-contain" />
                  ) : (
                    <div className="w-full h-full rounded-lg bg-slate-100 dark:bg-slate-700/50" />
                  )}
                </div>
                {/* Description accordion */}
                {current.description && (
                  <button
                    onClick={() => setDescOpen((v) => !v)}
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    <span>{descOpen ? "▲" : "▼"}</span>
                    <span>Beschreibung</span>
                  </button>
                )}
                {descOpen && current.description && (
                  <p className="text-sm text-slate-500 max-w-xs">{current.description}</p>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Timer — desktop only (mobile shows it inside the fixed bar) */}
      <div className={`hidden sm:block text-sm font-mono ${discarded ? "line-through text-slate-400" : "text-slate-400"}`}>
        {`${((phase === "thinking" ? elapsedMs : (durationMs ?? 0)) / 1000).toFixed(1)}s`}
      </div>

      {/* ─── Action bar ───────────────────────────────────────────────
          Mobile : fixed to bottom of screen (same position every phase)
          Desktop: static, inline below the card
      ──────────────────────────────────────────────────────────────── */}
      <div className="
        fixed bottom-0 inset-x-0 z-40
        bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm
        border-t border-slate-200 dark:border-slate-700
        px-4 pt-3 pb-8
        sm:static sm:inset-x-auto sm:border-0
        sm:bg-transparent sm:dark:bg-transparent
        sm:backdrop-filter-none sm:p-0
        sm:w-full sm:max-w-lg
      ">
        {/* Timer inside bar — mobile only */}
        <div className={`sm:hidden text-xs font-mono text-center mb-2 ${discarded ? "line-through text-slate-400" : "text-slate-400"}`}>
          {`${((phase === "thinking" ? elapsedMs : (durationMs ?? 0)) / 1000).toFixed(1)}s`}
        </div>

        {phase === "thinking" ? (
          <button
            onClick={reveal}
            className="w-full bg-slate-800 dark:bg-slate-600 hover:bg-slate-700 text-white font-semibold py-4 rounded-2xl text-lg shadow-md active:scale-95"
          >
            Auflösen <span className="text-xs font-mono text-slate-400 ml-2 hidden sm:inline">[Space]</span>
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Rating buttons — horizontal on both mobile and desktop */}
            <div className="flex gap-2 w-full">
              <button
                onClick={() => submitReview("instant")}
                className="flex-1 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold py-4 rounded-xl text-lg active:scale-95"
              >
                Sofort <span className="text-xs font-mono opacity-70 hidden sm:inline">[1]</span>
              </button>
              <button
                onClick={() => submitReview("slow")}
                className={`flex-1 font-semibold py-4 rounded-xl text-lg active:scale-95 ${
                  isSlowHint
                    ? "bg-yellow-400 hover:bg-yellow-500 text-slate-900 ring-2 ring-yellow-300"
                    : "bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-slate-900"
                }`}
              >
                Unsicher <span className="text-xs font-mono opacity-70 hidden sm:inline">[2]</span>
              </button>
              <button
                onClick={() => setShowConfusion(true)}
                className="flex-1 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold py-4 rounded-xl text-lg active:scale-95"
              >
                Fail <span className="text-xs font-mono opacity-70 hidden sm:inline">[3]</span>
              </button>
            </div>

            {/* Secondary row */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setDiscarded((v) => !v)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  discarded
                    ? "border-slate-400 bg-slate-100 dark:bg-slate-700 text-slate-500 line-through"
                    : "border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                Zeit verwerfen <span className="text-xs font-mono opacity-70 hidden sm:inline">[D]</span>
              </button>
              <div className="flex items-center gap-3">
                {undoAvailable && (
                  <button
                    onClick={undoLastRating}
                    className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                  >
                    ↩ Rückgängig <span className="hidden sm:inline opacity-60">[Ctrl+Z]</span>
                  </button>
                )}
                <button onClick={endSession} className="text-xs text-slate-400 hover:text-slate-600">
                  Session beenden
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
