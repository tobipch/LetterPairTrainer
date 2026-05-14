import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/session";

// DELETE /api/reviews/last?pair=AB
// Deletes the most recent review for the given pair by the current user
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const pair = req.nextUrl.searchParams.get("pair")?.toUpperCase();
    if (!pair) return NextResponse.json({ error: "pair required" }, { status: 400 });

    const latest = await db.query.reviews.findFirst({
      where: and(eq(reviews.userId, userId), eq(reviews.pair, pair)),
      orderBy: [desc(reviews.createdAt)],
    });

    if (!latest) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.delete(reviews).where(eq(reviews.id, latest.id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
