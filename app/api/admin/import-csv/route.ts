import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { db } from "@/db";
import { letterpairs } from "@/db/schema";
import { requireAuth } from "@/lib/session";

function normalizeHeader(h: string): string {
  const t = h.trim();
  if (t === "Q (SCH)") return "Q";
  if (t === "X (CH)") return "X";
  return t.toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
  }

  const text = await file.text();

  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const rows = parsed.data as string[][];

  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV zu kurz" }, { status: 400 });
  }

  const colHeaders = rows[0].slice(1).map(normalizeHeader);

  const toUpsert: { pair: string; word: string }[] = [];

  for (let ri = 1; ri < rows.length; ri++) {
    const row = rows[ri];
    if (!row || row.length === 0) continue;
    const rowHeader = normalizeHeader(row[0]);
    if (!rowHeader) continue;

    for (let ci = 0; ci < colHeaders.length; ci++) {
      const colHeader = colHeaders[ci];
      if (!colHeader) continue;
      const word = (row[ci + 1] ?? "").trim();
      if (!word) continue;
      toUpsert.push({ pair: `${colHeader}${rowHeader}`, word });
    }
  }

  if (toUpsert.length === 0) {
    return NextResponse.json({ error: "Keine Pairs gefunden" }, { status: 400 });
  }

  // Upsert in batches of 50
  let count = 0;
  const batchSize = 50;
  for (let i = 0; i < toUpsert.length; i += batchSize) {
    const batch = toUpsert.slice(i, i + batchSize);
    for (const { pair, word } of batch) {
      await db
        .insert(letterpairs)
        .values({ pair, word })
        .onConflictDoUpdate({
          target: letterpairs.pair,
          set: { word, updatedAt: new Date() },
        });
      count++;
    }
  }

  return NextResponse.json({ imported: count });
}
