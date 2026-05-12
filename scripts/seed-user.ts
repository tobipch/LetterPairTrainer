/**
 * Creates the initial admin user.
 * Usage: npm run seed
 * Set SEED_USERNAME and SEED_PASSWORD in .env (defaults: admin / changeme123)
 */

import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { users } from "../db/schema";

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
  const username = process.env.SEED_USERNAME ?? "admin";
  const password = process.env.SEED_PASSWORD ?? "changeme123";
  const hash = await bcrypt.hash(password, 12);

  const sqlClient = neon(DB_URL!);
  const db = drizzle(sqlClient);

  await db
    .insert(users)
    .values({ username, passwordHash: hash })
    .onConflictDoUpdate({
      target: users.username,
      set: { passwordHash: hash },
    });

  console.log(`User "${username}" seeded.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
