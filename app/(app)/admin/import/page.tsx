"use client";

import { useState, useRef } from "react";

export default function ImportCsvPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ imported?: number; error?: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/import-csv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
      setStatus(res.ok ? "done" : "error");
    } catch {
      setResult({ error: "Netzwerkfehler" });
      setStatus("error");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".csv")) {
      setFile(f);
      setStatus("idle");
      setResult(null);
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CSV importieren</h1>
        <p className="text-slate-500 text-sm mt-1">
          21×21 Matrix — Header: erster Buchstabe (Spalte), Zeile: zweiter Buchstabe.
          <br />
          <span className="font-mono text-xs">Q (SCH)</span> und{" "}
          <span className="font-mono text-xs">X (CH)</span> werden korrekt erkannt.
          Leere Zellen werden übersprungen. Import ist idempotent (upsert).
        </p>
      </div>

      <div
        className={`rounded-2xl border-2 border-dashed transition-colors p-8 text-center cursor-pointer ${
          isDragging
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : file
            ? "border-green-400 bg-green-50 dark:bg-green-900/10"
            : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        {file ? (
          <div>
            <div className="text-2xl mb-1">📄</div>
            <div className="font-semibold text-green-700 dark:text-green-400">{file.name}</div>
            <div className="text-xs text-slate-500 mt-1">
              {(file.size / 1024).toFixed(1)} KB · Klicken zum Ändern
            </div>
          </div>
        ) : (
          <div>
            <div className="text-3xl mb-2">📁</div>
            <div className="text-slate-600 dark:text-slate-300 font-medium">
              CSV hier ablegen oder klicken
            </div>
            <div className="text-xs text-slate-400 mt-1">.csv Datei</div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { setFile(f); setStatus("idle"); setResult(null); }
          }}
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || status === "uploading"}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-lg disabled:opacity-40 transition-colors"
      >
        {status === "uploading" ? "Importiere…" : "CSV importieren"}
      </button>

      {status === "done" && result?.imported != null && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-green-700 dark:text-green-300 text-center">
          ✓ <span className="font-bold">{result.imported} Pairs</span> erfolgreich importiert / aktualisiert
        </div>
      )}

      {status === "error" && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300 text-center">
          Fehler: {result?.error ?? "Unbekannter Fehler"}
        </div>
      )}

      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-xs text-slate-500 space-y-1">
        <div className="font-semibold text-slate-600 dark:text-slate-400 mb-2">Erwartetes CSV-Format</div>
        <div className="font-mono overflow-x-auto whitespace-pre">
{`,A,B,C,…,Q (SCH),…,X (CH),…
A,,Abi,Ace,…
B,Bahn,,Bier,…
…`}
        </div>
        <div className="mt-2">Erste Zeile = Spalten-Header (1. Buchstabe), erste Spalte = Zeilen-Header (2. Buchstabe)</div>
      </div>
    </div>
  );
}
