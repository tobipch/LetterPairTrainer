"use client";

import { useState, useEffect, useRef } from "react";

export type ConfusionResult =
  | { type: "none" }
  | { type: "other_pair"; pair: string }
  | { type: "wrong_word"; text: string }
  | { type: "skip" };

interface Props {
  onDone: (result: ConfusionResult) => void;
  pastWrongWords?: string[];
}

export default function ConfusionDialog({ onDone, pastWrongWords = [] }: Props) {
  const [selected, setSelected] = useState<"none" | "other_pair" | "wrong_word" | null>(null);
  const [pairInput, setPairInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selected]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "1") { e.preventDefault(); setSelected("none"); }
      if (e.key === "2") { e.preventDefault(); setSelected("other_pair"); }
      if (e.key === "3") { e.preventDefault(); setSelected("wrong_word"); }
      if (e.key === "4" || e.key === "Escape") { e.preventDefault(); onDone({ type: "skip" }); }
      if (e.key === "Enter" && selected) {
        e.preventDefault();
        handleConfirm();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function handleConfirm() {
    if (selected === "none") {
      onDone({ type: "none" });
    } else if (selected === "other_pair") {
      const p = pairInput.trim().toUpperCase();
      if (p.length < 2) return;
      onDone({ type: "other_pair", pair: p });
    } else if (selected === "wrong_word") {
      const t = textInput.trim();
      if (!t) return;
      onDone({ type: "wrong_word", text: t });
    }
  }

  // Deduplicated past wrong words, most recent first, max 6
  const suggestions = [...new Set(pastWrongWords)].slice(0, 6);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-1">Verwechslung?</h2>
        <p className="text-sm text-slate-500 mb-4">Was ist schiefgelaufen?</p>

        <div className="space-y-2 mb-4">
          <button
            onClick={() => setSelected("none")}
            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
              selected === "none"
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
            }`}
          >
            <span className="text-xs font-mono text-slate-400 mr-2">[1]</span>
            Blackout / kein Wort
          </button>

          <button
            onClick={() => setSelected("other_pair")}
            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
              selected === "other_pair"
                ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
            }`}
          >
            <span className="text-xs font-mono text-slate-400 mr-2">[2]</span>
            Anderes Letterpair gedacht
          </button>
          {selected === "other_pair" && (
            <input
              ref={inputRef}
              type="text"
              placeholder="z.B. AD"
              maxLength={4}
              value={pairInput}
              onChange={(e) => setPairInput(e.target.value.toUpperCase())}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          )}

          <button
            onClick={() => setSelected("wrong_word")}
            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
              selected === "wrong_word"
                ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
            }`}
          >
            <span className="text-xs font-mono text-slate-400 mr-2">[3]</span>
            Falsches Wort gedacht
          </button>
          {selected === "wrong_word" && (
            <div className="mt-1 space-y-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Welches Wort?"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setTextInput(w)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        textInput === w
                          ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                          : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {selected && (
            <button
              onClick={handleConfirm}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm"
            >
              Bestätigen ↵
            </button>
          )}
          <button
            onClick={() => onDone({ type: "skip" })}
            className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <span className="text-xs font-mono text-slate-400 mr-1">[4]</span>
            Überspringen
          </button>
        </div>
      </div>
    </div>
  );
}
