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
  customPairs?: string[];
}

type Phase = "thinking" | "rating" | "done";

export default function TrainSession({
  mode,
  direction,
  sessionId,
  slowThresholdMs,
  customPairs,
}: Props) {
  const [current, setCurrent] = useState<Pair | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [phase, setPhase] = useState<Phase>("thinking");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [discarded, setDiscarded] = useState(false);
  const [showConfusion, setShowConfusion] = useState(false);
  const [done, setDone] = useState(false);
  const [actualDirection, setActualDirection] = useState<"lp_to_word" | "word_to_lp">("lp_to_word");
  const [donePairs, setDonePairs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const startRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hiddenRef = useRef(false);

  const resolveDirection = useCallback(
    (d: "lp_to_word" | "word_to_lp" | "random"): "lp_to_word" | "word_to_lp" => {
      if (d === "random") return Math.random() < 0.5 ? "lp_to_word" : "word_to_lp";
      return d;
    },
    []
  );

  const fetchNext = useCallback(async () => {
    setLoading(true);
    const excludeParam = donePairs.join(",");
    const params = new URLSearchParams({ mode });
    if (excludeParam) params.set("exclude", excludeParam);
    if (mode === "hard_only") params.set("limit", "50");

    const res = await fetch(`/api/sessions/next?${params}`);
    const data = await res.json();

    if (data.done || !data.pair) {
      setDone(true);
      setLoading(false);
      return;
    }

    setCurrent(data.pair);
    setRemaining(data.remaining ?? 0);
    setTotal(data.total ?? 0);
    setActualDirection(resolveDirection(direction));
    setPhase("thinking");
    setDiscarded(false);
    setElapsedMs(0);
    startRef.current = performance.now();
    setLoading(false);
  }, [donePairs, mode, direction, resolveDirection]);

  // Initial load
  useEffect(() => {
    fetchNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer
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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Pause on tab hide
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) {
        hiddenRef.current = true;
      } else {
        hiddenRef.current = false;
        if (phase === "thinking") {
          startRef.current = performance.now() - elapsedMs;
        }
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [phase, elapsedMs]);

  function reveal() {
    if (phase !== "thinking") return;
    const elapsed = performance.now() - startRef.current;
    setDurationMs(Math.round(elapsed));
    setElapsedMs(elapsed);
    setPhase("rating");
  }

  async function submitReview(
    result: "instant" | "slow" | "fail",
    confusion?: ConfusionResult
  ) {
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

    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setDonePairs((prev) => [...prev, current.pair]);
    fetchNext();
  }

  // Keyboard shortcuts
  useEffect(() => {
    if (showConfusion) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (phase === "thinking" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        reveal();
      }
      if (phase === "rating") {
        if (e.key === "1") { e.preventDefault(); submitReview("instant"); }
        if (e.key === "2") { e.preventDefault(); submitReview("slow"); }
        if (e.key === "3") { e.preventDefault(); setShowConfusion(true); }
        if (e.key === "d" || e.key === "D") { e.preventDefault(); setDiscarded((v) => !v); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, showConfusion, durationMs, discarded, current]);

  async function endSession() {
    await fetch(`/api/sessions/${sessionId}`, { method: "PATCH" });
    window.location.href = "/dashboard";
  }

  if (loading && !current) {
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
        <p className="text-slate-500">{donePairs.length} Pairs trainiert</p>
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
        <span>
          {total > 0 ? `${total - remaining + 1} / ${total}` : ""}
        </span>
      </div>

      {/* Progress bar */}
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
                  {actualDirection === "lp_to_word"
                    ? displayPair(current.pair)
                    : current.word}
                </div>
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                  {actualDirection === "lp_to_word" ? "Auflösung" : "Pair"}
                </p>
                <div className="text-5xl font-bold tracking-wider">
                  {actualDirection === "lp_to_word"
                    ? displayPair(current.pair)
                    : current.word}
                </div>
                <div className="text-2xl text-blue-600 font-semibold">
                  {actualDirection === "lp_to_word"
                    ? current.word
                    : displayPair(current.pair)}
                </div>
                {current.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.imageUrl}
                    alt={current.word}
                    className="max-h-32 rounded-lg object-contain"
                  />
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
      <div className={`text-sm font-mono ${phase === "rating" && discarded ? "line-through text-slate-400" : "text-slate-400"}`}>
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

      <button
        onClick={endSession}
        className="text-xs text-slate-400 hover:text-slate-600 mt-4"
      >
        Session beenden
      </button>
    </div>
  );
}
