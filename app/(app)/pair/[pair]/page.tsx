"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { displayPair } from "@/lib/pairs";
import PairChart from "@/components/pair/PairChart";

interface Review {
  id: number;
  direction: string;
  result: "instant" | "slow" | "fail";
  durationMs: number | null;
  durationDiscarded: boolean;
  confusionType: string | null;
  confusedWithPair: string | null;
  confusedWithText: string | null;
  createdAt: string;
}

interface PairDetail {
  id: number;
  pair: string;
  word: string;
  description: string | null;
  imageUrl: string | null;
  updatedAt: string;
  history: Review[];
}

export default function PairDetailPage() {
  const { pair } = useParams<{ pair: string }>();
  const router = useRouter();
  const [data, setData] = useState<PairDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editWord, setEditWord] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/letterpairs/${pair}`);
    const d = await res.json();
    setData(d);
    setEditWord(d.word ?? "");
    setEditDesc(d.description ?? "");
    setLoading(false);
  }, [pair]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!data) return;
    setSaving(true);
    await fetch(`/api/letterpairs/${pair}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: editWord, description: editDesc }),
    });
    await load();
    setSaving(false);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`/api/letterpairs/${pair}/image`, {
      method: "POST",
      body: formData,
    });
    await load();
    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) uploadImage(file);
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Lade…</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Pair nicht gefunden</div>;

  const reviews = data.history ?? [];
  const totalReviews = reviews.length;
  const instantCount = reviews.filter((r) => r.result === "instant").length;
  const slowCount = reviews.filter((r) => r.result === "slow").length;
  const failCount = reviews.filter((r) => r.result === "fail").length;
  const durations = reviews
    .filter((r) => !r.durationDiscarded && r.durationMs != null)
    .map((r) => r.durationMs!);
  const avgMs =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  const sorted = [...durations].sort((a, b) => a - b);
  const medianMs =
    sorted.length > 0
      ? sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)]
      : null;

  // Confusion stats
  const confusionPairCounts = new Map<string, number>();
  const confusionTextItems: string[] = [];
  for (const r of reviews) {
    if (r.confusionType === "other_pair" && r.confusedWithPair) {
      confusionPairCounts.set(r.confusedWithPair, (confusionPairCounts.get(r.confusedWithPair) ?? 0) + 1);
    }
    if (r.confusionType === "wrong_word" && r.confusedWithText) {
      confusionTextItems.push(r.confusedWithText);
    }
  }
  const topConfusions = [...confusionPairCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">←</button>
        <h1 className="text-3xl font-bold font-mono">{displayPair(data.pair)}</h1>
        <span className="text-2xl text-blue-600 font-semibold">{data.word}</span>
      </div>

      {/* Image */}
      <div
        className={`rounded-2xl border-2 border-dashed transition-colors ${
          isDragging ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" : "border-slate-200 dark:border-slate-600"
        } p-4 flex flex-col items-center gap-3`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {data.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.imageUrl} alt={data.word} className="max-h-48 rounded-xl object-contain" />
        ) : (
          <div className="text-slate-400 text-sm text-center py-4">
            Kein Bild · Drag & Drop oder
          </div>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          {uploading ? "Wird hochgeladen…" : "Bild hochladen"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadImage(file);
          }}
        />
      </div>

      {/* Edit */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-5 space-y-3">
        <h2 className="font-semibold">Bearbeiten</h2>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Wort</label>
          <input
            value={editWord}
            onChange={(e) => setEditWord(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Beschreibung</label>
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={3}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {saving ? "Speichere…" : "Speichern"}
        </button>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
        <h2 className="font-semibold mb-3">Statistik</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Stat label="Reviews" value={totalReviews} />
          <Stat label="Sofort" value={`${instantCount} (${totalReviews > 0 ? ((instantCount / totalReviews) * 100).toFixed(0) : 0}%)`} color="text-green-600" />
          <Stat label="Langsam" value={`${slowCount} (${totalReviews > 0 ? ((slowCount / totalReviews) * 100).toFixed(0) : 0}%)`} color="text-yellow-600" />
          <Stat label="Fail" value={`${failCount} (${totalReviews > 0 ? ((failCount / totalReviews) * 100).toFixed(0) : 0}%)`} color="text-red-600" />
          <Stat label="Ø Zeit" value={avgMs != null ? `${(avgMs / 1000).toFixed(2)}s` : "—"} />
          <Stat label="Median Zeit" value={medianMs != null ? `${(medianMs / 1000).toFixed(2)}s` : "—"} />
        </div>

        {reviews.length > 0 && <PairChart reviews={reviews} />}

        {topConfusions.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-500 mb-1">Oft verwechselt mit:</h3>
            <div className="flex flex-wrap gap-2">
              {topConfusions.map(([p, count]) => (
                <span key={p} className="bg-orange-100 dark:bg-orange-900/20 text-orange-700 text-xs px-2 py-1 rounded-full">
                  {p} ({count}x)
                </span>
              ))}
            </div>
          </div>
        )}
        {confusionTextItems.length > 0 && (
          <div className="mt-3">
            <h3 className="text-sm font-medium text-slate-500 mb-1">Falsche Wörter:</h3>
            <div className="flex flex-wrap gap-2">
              {[...new Set(confusionTextItems)].slice(0, 8).map((t) => (
                <span key={t} className="bg-slate-100 dark:bg-slate-700 text-slate-600 text-xs px-2 py-1 rounded-full">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className={`font-semibold ${color ?? ""}`}>{value}</div>
    </div>
  );
}
