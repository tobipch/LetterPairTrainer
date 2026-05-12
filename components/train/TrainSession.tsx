"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ConfusionDialog, { ConfusionResult } from "./ConfusionDialog";
import { displayPair } from "@/lib/pairs";

interface Pair {
  id: number;
  pair: string;
  word: string;
  description?: string | null;
  imageUrl?: string | null;
}

interface Props {
  mode: "daily_all" | "hard_only" | "custom";
  direction: "lp_to_word" | "word_to_lp" | "random";
  sessionId: number;
  slowThresholdMs: number;
}

type Phase = "thinking" | "rating" | "done";

export default function TrainSession({ mode, direction, sessionId, slowThresholdMs }: Props) {
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

  // Refs to avoid stale closures in async functions
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
    if (mode === "hard_only") params.set("limit", "50");
    return `/api/sessions/next?${params}`;
  }, [mode]);

  // Pre-fetch the next pair silently in the background
  const prefetchNext = useCallback(async (extraExclude: string[] = []) => {
    if (prefetchingRef.current) return;
    prefetchingRef.current = true;
    try {
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

  function startTimer() {
    startRef.current = performance.now();
    setElapsedMs(0);
  }

  // Initial load: fetch first pair, then immediately prefetch second
  useEffect(() => {
    async function init() {
      const res = await fetch(buildNextUrl());
      const data = await res.json();
      if (data.done || !data.pair) {
        setDone(true);
        setInitialLoading(false);
        return;
      }
      setCurrent(data.pair);
      setRemaining(data.remaining ?? 0);
      setTotal(data.total ?? 0);
      setActualDirection(resolveDirection(direction));
      startTimer();
      setInitialLoading(false);
      // Immediately prefetch next
      donePairsRef.current = [data.pair.pair];
      prefetchNext([data.pair.pair]);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer tick
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

  // Pause on tab hide
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

  // Advance instantly to prefetched pair, fire review POST in background
  const submitReview = useCallback(async (
    result: "instant" | "slow" | "fail",
    confusion?: ConfusionResult
  ) => {
    if (!current) return;

    const body: Record<string, unknown> = {
      pair: current.pair,
      direction: actualDirection,
      result,
      durationMs: discarded ? undefined : durationMs,
      durationDiscarded: discarded,
      sessionId,
    };
    if (confusion && confusion.type !== "skip") {
      body.confusionType = confusion.type;
      if (confusion.type === "other_pair") body.confusedWithPair = confusion.pair;
      if (confusion.type === "wrong_word") body.confusedWithText = confusion.text;
    }

    // Fire review POST in background — do NOT await
    fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});

    // Mark current as done
    donePairsRef.current = [...donePairsRef.current, current.pair];

    // Instantly advance to pre-fetched pair
    if (prefetched) {
      const next = prefetched;
      setCurrent(next.pair);
      setRemaining(next.remaining);
      setTotal(next.total);
      setActualDirection(resolveDirection(direction));
      setPhase("thinking");
      setDiscarded(false);
      setDurationMs(null);
      setPrefetched(null);
      startTimer();
      // Pre-fetch the one after
      prefetchNext([next.pair.pair]);
    } else {
      // Fallback: nothing prefetched yet — fetch on demand
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
        startTimer();
        donePairsRef.current = [...donePairsRef.current, data.pair.pair];
        prefetchNext([data.pair.pair]);
      }
    }
  }, [current, actualDirection, discarded, durationMs, sessionId, prefetched, direction, resolveDirection, prefetchNext, buildNextUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    if (showConfusion) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
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
  }, [phase, showConfusion, submitReview]);

  async function endSession() {
    await fetch(`/api/sessions/${sessionId}`, { method: "PATCH" });
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
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-4xl">🎉</div>
        <h2 className="text-2xl font-bold">Session abgeschlossen!</h2>
        <p className="text-slate-500">{donePairsRef.current.length} Pairs trainiert</p>
        <button
          onClick={endSession}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl"
        >
          Zum Dashboard
        </button>
      </div>
    );
  }

  const isSlowHint = phase === "rating" && !discarded && durationMs != null && durationMs > slowThresholdMs;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {showConfusion && (
        <ConfusionDialog
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
                {current.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.imageUrl} alt={current.word} className="max-h-32 rounded-lg object-contain" />
                )}
                {current.description && (
                  <p className="text-sm text-slate-500 max-w-xs">{current.description}</p>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Timer */}
      <div className={`text-sm font-mono ${discarded ? "line-through text-slate-400" : "text-slate-400"}`}>
        {`${((phase === "thinking" ? elapsedMs : (durationMs ?? 0)) / 1000).toFixed(1)}s`}
      </div>

      {/* Actions */}
      {phase === "thinking" ? (
        <button
          onClick={reveal}
          className="bg-slate-800 dark:bg-slate-600 hover:bg-slate-700 text-white font-semibold px-8 py-4 rounded-2xl text-lg shadow-md active:scale-95"
        >
          Auflösen <span className="text-xs font-mono text-slate-400 ml-2">[Space]</span>
        </button>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full max-w-lg">
          <div className="flex gap-3 w-full">
            <button
              onClick={() => submitReview("instant")}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-4 rounded-xl text-lg active:scale-95"
            >
              Sofort <span className="text-xs font-mono opacity-70">[1]</span>
            </button>
            <button
              onClick={() => submitReview("slow")}
              className={`flex-1 font-semibold py-4 rounded-xl text-lg active:scale-95 ${
                isSlowHint
                  ? "bg-yellow-400 hover:bg-yellow-500 text-slate-900 ring-2 ring-yellow-300"
                  : "bg-yellow-400 hover:bg-yellow-500 text-slate-900"
              }`}
            >
              Langsam <span className="text-xs font-mono opacity-70">[2]</span>
            </button>
            <button
              onClick={() => setShowConfusion(true)}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-4 rounded-xl text-lg active:scale-95"
            >
              Fail <span className="text-xs font-mono opacity-70">[3]</span>
            </button>
          </div>
          <button
            onClick={() => setDiscarded((v) => !v)}
            className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
              discarded
                ? "border-slate-400 bg-slate-100 dark:bg-slate-700 text-slate-500 line-through"
                : "border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            Zeit verwerfen <span className="text-xs font-mono opacity-70">[D]</span>
          </button>
        </div>
      )}

      <button onClick={endSession} className="text-xs text-slate-400 hover:text-slate-600 mt-4">
        Session beenden
      </button>
    </div>
  );
}
