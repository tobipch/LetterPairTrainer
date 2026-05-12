import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { letterpairs, reviews } from "@/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/session";
import { computeAllPairStats } from "@/lib/difficulty";

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") ?? "daily_all";
    const excludeParam = searchParams.get("exclude") ?? "";
    const exclude = excludeParam ? excludeParam.split(",") : [];

    const allPairs = await db.query.letterpairs.findMany();

    if (mode === "daily_all") {
      const todayReviews = await db.query.reviews.findMany({
        where: and(eq(reviews.userId, userId), gte(reviews.createdAt, todayStart())),
      });
      const donePairs = new Set(todayReviews.map((r) => r.pair));
      const remaining = allPairs.filter(
        (p) => !donePairs.has(p.pair) && !exclude.includes(p.pair)
      );
      if (!remaining.length) return NextResponse.json({ done: true });
      const next = remaining[Math.floor(Math.random() * remaining.length)];
      return NextResponse.json({ pair: next, remaining: remaining.length, total: allPairs.length });
    }

    if (mode === "hard_only") {
      const limitParam = searchParams.get("limit");
      const limit = limitParam ? parseInt(limitParam) : 50;
      const statsMap = await computeAllPairStats(userId);
      const scored = allPairs
        .filter((p) => !exclude.includes(p.pair))
        .map((p) => ({
          ...p,
          score: statsMap.get(p.pair)?.difficultyScore ?? 1.0,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      if (!scored.length) return NextResponse.json({ done: true });
      const next = scored[Math.floor(Math.random() * Math.min(10, scored.length))];
      return NextResponse.json({ pair: next, remaining: scored.length, total: scored.length });
    }

    // custom: random from all, excluding done
    const remaining = allPairs.filter((p) => !exclude.includes(p.pair));
    if (!remaining.length) return NextResponse.json({ done: true });
    const next = remaining[Math.floor(Math.random() * remaining.length)];
    return NextResponse.json({ pair: next, remaining: remaining.length, total: allPairs.length });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
