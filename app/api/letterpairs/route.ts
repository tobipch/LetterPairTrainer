import { NextResponse } from "next/server";
import { db } from "@/db";
import { letterpairs } from "@/db/schema";
import { requireAuth } from "@/lib/session";
import { computeAllPairStats } from "@/lib/difficulty";

export async function GET() {
  try {
    const { userId } = await requireAuth();
    const pairs = await db.query.letterpairs.findMany({
      orderBy: (lp, { asc }) => [asc(lp.pair)],
    });
    const statsMap = await computeAllPairStats(userId);
    const result = pairs.map((p) => ({
      ...p,
      stats: statsMap.get(p.pair) ?? {
        total: 0,
        instantCount: 0,
        slowCount: 0,
        failCount: 0,
        instantRate: 0,
        slowRate: 0,
        failRate: 0,
        avgDurationMs: null,
        medianDurationMs: null,
        difficultyScore: 1.0,
        lastReviewAt: null,
      },
    }));
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
