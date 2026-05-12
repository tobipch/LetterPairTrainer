import { db } from "@/db";
import { reviews } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export interface PairStats {
  total: number;
  instantCount: number;
  slowCount: number;
  failCount: number;
  instantRate: number;
  slowRate: number;
  failRate: number;
  avgDurationMs: number | null;
  medianDurationMs: number | null;
  difficultyScore: number;
  lastReviewAt: Date | null;
}

export function calcDifficultyScore(
  failRate: number,
  slowRate: number,
  normalizedDuration: number,
  total: number
): number {
  if (total < 3) return 1.0;
  return failRate * 0.5 + slowRate * 0.25 + normalizedDuration * 0.25;
}

export function interpolateColor(score: number): string {
  // 0 = green (#22c55e), 0.5 = yellow (#eab308), 1 = red (#ef4444)
  const clamped = Math.max(0, Math.min(1, score));
  if (clamped <= 0.5) {
    const t = clamped * 2;
    return lerpColor("#22c55e", "#eab308", t);
  } else {
    const t = (clamped - 0.5) * 2;
    return lerpColor("#eab308", "#ef4444", t);
  }
}

function lerpColor(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bv = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bv.toString(16).padStart(2, "0")}`;
}

export async function computeAllPairStats(
  userId: number
): Promise<Map<string, PairStats>> {
  const allReviews = await db.query.reviews.findMany({
    where: eq(reviews.userId, userId),
    orderBy: [desc(reviews.createdAt)],
  });

  const byPair = new Map<string, typeof allReviews>();
  for (const r of allReviews) {
    if (!byPair.has(r.pair)) byPair.set(r.pair, []);
    byPair.get(r.pair)!.push(r);
  }

  // compute global max avg duration for normalization
  let globalMaxAvg = 1;
  for (const [, rs] of byPair) {
    const last20 = rs.slice(0, 20);
    const durations = last20
      .filter((r) => !r.durationDiscarded && r.durationMs != null)
      .map((r) => r.durationMs!);
    if (durations.length > 0) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      if (avg > globalMaxAvg) globalMaxAvg = avg;
    }
  }

  const result = new Map<string, PairStats>();
  for (const [pair, rs] of byPair) {
    const last20 = rs.slice(0, 20);
    const total = last20.length;
    const instantCount = last20.filter((r) => r.result === "instant").length;
    const slowCount = last20.filter((r) => r.result === "slow").length;
    const failCount = last20.filter((r) => r.result === "fail").length;
    const failRate = total > 0 ? failCount / total : 0;
    const slowRate = total > 0 ? slowCount / total : 0;

    const durations = last20
      .filter((r) => !r.durationDiscarded && r.durationMs != null)
      .map((r) => r.durationMs!);
    const avgDurationMs =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : null;
    const medianDurationMs =
      durations.length > 0
        ? (() => {
            const sorted = [...durations].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 === 0
              ? (sorted[mid - 1] + sorted[mid]) / 2
              : sorted[mid];
          })()
        : null;
    const normalizedDuration = avgDurationMs != null ? avgDurationMs / globalMaxAvg : 0;
    const difficultyScore = calcDifficultyScore(failRate, slowRate, normalizedDuration, total);

    result.set(pair, {
      total: rs.length,
      instantCount,
      slowCount,
      failCount,
      instantRate: total > 0 ? instantCount / total : 0,
      slowRate,
      failRate,
      avgDurationMs,
      medianDurationMs,
      difficultyScore,
      lastReviewAt: rs[0]?.createdAt ?? null,
    });
  }

  return result;
}
