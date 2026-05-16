/**
 * Run database migrations manually, splitting on -->statement-breakpoint
 * so each statement is sent individually to Neon HTTP.
 */

import * as fs from "fs";
import * as path from "path";
import { neon } from "@neondatabase/serverless";

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

async function main() {
  const sql = neon(DB_URL!);

  // Ensure migrations tracking table exists
  await sql(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  // Load journal
  const journalPath = path.join(process.cwd(), "db/migrations/meta/_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));

  // Get applied migrations
  const applied = await sql(`SELECT hash FROM "__drizzle_migrations"`);
  const appliedSet = new Set(applied.map((r: { hash: string }) => r.hash));

  for (const entry of journal.entries) {
    const tag = entry.tag as string;
    if (appliedSet.has(tag)) {
      console.log(`  skip: ${tag}`);
      continue;
    }

    const filePath = path.join(process.cwd(), "db/migrations", `${tag}.sql`);
    const content = fs.readFileSync(filePath, "utf-8");

    // Split on the drizzle breakpoint marker
    const statements = content
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`  apply: ${tag} (${statements.length} statement(s))`);
    for (const stmt of statements) {
      await sql(stmt);
    }

    await sql(
      `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
      [tag, Date.now()]
    );
  }

  console.log("Migrations applied.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
