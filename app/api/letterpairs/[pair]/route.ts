import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { letterpairs, reviews } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { pair } = await params;
    const lp = await db.query.letterpairs.findFirst({
      where: eq(letterpairs.pair, pair.toUpperCase()),
    });
    if (!lp) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const history = await db.query.reviews.findMany({
      where: eq(reviews.pair, pair.toUpperCase()),
      orderBy: [desc(reviews.createdAt)],
    });
    const userHistory = history.filter((r) => r.userId === userId);

    return NextResponse.json({ ...lp, history: userHistory });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  try {
    await requireAuth();
    const { pair } = await params;
    const body = await req.json();
    const { word, description, imageUrl } = body;

    const updated = await db
      .update(letterpairs)
      .set({
        ...(word !== undefined && { word }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        updatedAt: new Date(),
      })
      .where(eq(letterpairs.pair, pair.toUpperCase()))
      .returning();

    if (!updated.length)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated[0]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
