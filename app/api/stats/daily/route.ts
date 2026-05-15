import { NextResponse } from "next/server";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { requireAuth } from "@/lib/session";

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    const rows = await db.query.reviews.findMany({
      where: and(eq(reviews.userId, userId), gte(reviews.createdAt, since)),
    });

    // Group by calendar date
    const byDate = new Map<string, { instant: number; slow: number; fail: number }>();
    for (const r of rows) {
      const d = r.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!byDate.has(key)) byDate.set(key, { instant: 0, slow: 0, fail: 0 });
      byDate.get(key)![r.result as "instant" | "slow" | "fail"]++;
    }

    // Fill all 30 days (including days with 0 reviews)
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const day = byDate.get(key) ?? { instant: 0, slow: 0, fail: 0 };
      result.push({ date: key, ...day, total: day.instant + day.slow + day.fail });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
