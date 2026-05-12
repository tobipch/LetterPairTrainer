/**
 * Usage: npm run import -- --file path/to/letterpairs.csv
 *
 * CSV format (21x21 matrix):
 * - First row: headers (first cell empty, rest = first letter of pair)
 * - Each subsequent row: first cell = second letter, rest = words
 * - Empty cells are skipped
 * - "Q (SCH)" -> stored as "Q", "X (CH)" -> stored as "X"
 */

import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { letterpairs } from "../db/schema";
import { sql } from "drizzle-orm";

// Load .env
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^=#]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

function normalizeHeader(h: string): string {
  const trimmed = h.trim();
  if (trimmed === "Q (SCH)") return "Q";
  if (trimmed === "X (CH)") return "X";
  return trimmed.toUpperCase();
}

async function main() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf("--file");
  const filePath = fileIdx !== -1 ? args[fileIdx + 1] : args[0];

  if (!filePath) {
    console.error("Usage: npm run import -- --file path/to/letterpairs.csv");
    process.exit(1);
  }

  const csvContent = fs.readFileSync(path.resolve(filePath), "utf-8");
  const parsed = Papa.parse<string[]>(csvContent, { skipEmptyLines: false });
  const rows = parsed.data as string[][];

  if (rows.length < 2) {
    console.error("CSV has too few rows");
    process.exit(1);
  }

  const headerRow = rows[0];
  // Column headers (first letter of pair), skip first cell
  const colHeaders = headerRow.slice(1).map(normalizeHeader);

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

      // pair = firstLetter + secondLetter
      const pair = `${colHeader}${rowHeader}`;
      toUpsert.push({ pair, word });
    }
  }

  console.log(`Found ${toUpsert.length} pairs to upsert`);

  const sqlClient = neon(DB_URL!);
  const db = drizzle(sqlClient);

  let count = 0;
  for (const { pair, word } of toUpsert) {
    await db
      .insert(letterpairs)
      .values({ pair, word })
      .onConflictDoUpdate({
        target: letterpairs.pair,
        set: { word, updatedAt: new Date() },
      });
    count++;
    if (count % 50 === 0) console.log(`  Upserted ${count}/${toUpsert.length}`);
  }

  console.log(`Done. Upserted ${count} pairs.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
