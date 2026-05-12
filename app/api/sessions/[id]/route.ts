import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const session = await db.query.trainSessions.findFirst({
      where: eq(trainSessions.id, parseInt(id)),
    });
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const [updated] = await db
      .update(trainSessions)
      .set({ endedAt: new Date() })
      .where(eq(trainSessions.id, parseInt(id)))
      .returning();
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
