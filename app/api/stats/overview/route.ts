import { NextResponse } from "next/server";
import { db } from "@/db";
import { reviews, letterpairs, trainSessions } from "@/db/schema";
import { eq, and, gte, isNull, isNotNull, desc } from "drizzle-orm";
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

function dateHash(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const [allReviews, totalPairs, completedDailySessions] = await Promise.all([
      db.query.reviews.findMany({
        where: eq(reviews.userId, userId),
        orderBy: [desc(reviews.createdAt)],
      }),
      db.query.letterpairs.findMany({
        orderBy: (lp, { asc }) => [asc(lp.pair)],
      }),
      db.query.trainSessions.findMany({
        where: and(
          eq(trainSessions.userId, userId),
          eq(trainSessions.mode, "daily_all"),
          isNotNull(trainSessions.endedAt)
        ),
      }),
    ]);

    const totalCount = totalPairs.length;

    // Today's done pairs
    const todayReviews = allReviews.filter((r) => r.createdAt >= todayStart());
    const todayDone = new Set(todayReviews.map((r) => r.pair)).size;

    // Streak: only days with a completed Daily All session
    let streak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    while (true) {
      const dayStart = new Date(checkDate);
      const dayEnd = new Date(checkDate);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const completed = completedDailySessions.some(
        (s) => s.endedAt! >= dayStart && s.endedAt! < dayEnd
      );
      if (!completed) break;
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Last 7 days
    const week = allReviews.filter((r) => r.createdAt >= daysAgo(7));
    const weekSuccessRate =
      week.length > 0
        ? week.filter((r) => r.result !== "fail").length / week.length
        : null;
    const weekDurations = week
      .filter((r) => !r.durationDiscarded && r.durationMs != null)
      .map((r) => r.durationMs!);
    const avgDurationMs =
      weekDurations.length > 0
        ? weekDurations.reduce((a, b) => a + b, 0) / weekDurations.length
        : null;

    // Active daily session (started today, not ended)
    const activeSession = await db.query.trainSessions.findFirst({
      where: and(
        eq(trainSessions.userId, userId),
        eq(trainSessions.mode, "daily_all"),
        gte(trainSessions.startedAt, todayStart()),
        isNull(trainSessions.endedAt)
      ),
    });

    // Daily word: stable per day via date hash, independent of description state
    let dailyWord = null;
    let dailyWordDone = false;
    if (totalPairs.length > 0) {
      const idx = dateHash() % totalPairs.length;
      const picked = totalPairs[idx];
      dailyWord = picked;
      dailyWordDone = !!picked.description;
    }

    return NextResponse.json({
      totalCount,
      todayDone,
      streak,
      weekSuccessRate,
      avgDurationMs,
      activeSession: activeSession ?? null,
      dailyWord,
      dailyWordDone,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
