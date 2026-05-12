import { NextResponse } from "next/server";
import { db } from "@/db";
import { reviews, letterpairs } from "@/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/session";
import { computeAllPairStats } from "@/lib/difficulty";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const allReviews = await db.query.reviews.findMany({
      where: eq(reviews.userId, userId),
      orderBy: [desc(reviews.createdAt)],
    });

    const totalPairs = await db.query.letterpairs.findMany();
    const totalCount = totalPairs.length;

    // Today's reviews
    const todayReviews = allReviews.filter(
      (r) => r.createdAt >= todayStart()
    );
    const todayDone = new Set(todayReviews.map((r) => r.pair)).size;

    // Streak calculation
    let streak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    while (true) {
      const dayStart = new Date(checkDate);
      const dayEnd = new Date(checkDate);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const hasReview = allReviews.some(
        (r) => r.createdAt >= dayStart && r.createdAt < dayEnd
      );
      if (!hasReview) break;
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Last 7 days success rate
    const week = allReviews.filter((r) => r.createdAt >= daysAgo(7));
    const weekSuccessRate =
      week.length > 0
        ? week.filter((r) => r.result !== "fail").length / week.length
        : null;

    // Avg duration last 7 days (not discarded)
    const weekDurations = week
      .filter((r) => !r.durationDiscarded && r.durationMs != null)
      .map((r) => r.durationMs!);
    const avgDuration =
      weekDurations.length > 0
        ? weekDurations.reduce((a, b) => a + b, 0) / weekDurations.length
        : null;

    // Daily word: pair with highest difficulty_score that has no description
    const statsMap = await computeAllPairStats(userId);
    const noDesc = totalPairs.filter((p) => !p.description);
    const dailyWord = noDesc.sort((a, b) => {
      const sa = statsMap.get(a.pair)?.difficultyScore ?? 1.0;
      const sb = statsMap.get(b.pair)?.difficultyScore ?? 1.0;
      return sb - sa;
    })[0] ?? null;

    return NextResponse.json({
      totalCount,
      todayDone,
      streak,
      weekSuccessRate,
      avgDurationMs: avgDuration,
      dailyWord,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
