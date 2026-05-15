import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/session";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const { userId } = await requireAuth();
    let s = await db.query.settings.findFirst({
      where: eq(settings.userId, userId),
    });
    if (!s) {
      [s] = await db
        .insert(settings)
        .values({ userId })
        .onConflictDoNothing()
        .returning();
      if (!s) {
        s = await db.query.settings.findFirst({ where: eq(settings.userId, userId) });
      }
    }
    return NextResponse.json(s);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const schema = z.object({
  directionDefault: z.enum(["lp_to_word", "word_to_lp", "random"]).optional(),
  slowThresholdMs: z.number().int().min(500).max(30000).optional(),
  hardOnlyCount: z.number().int().min(5).max(300).optional(),
  newPassword: z.string().min(6).optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();
    const parsed = schema.parse(body);

    if (parsed.newPassword) {
      const hash = await bcrypt.hash(parsed.newPassword, 12);
      await db.update(users).set({ passwordHash: hash }).where(eq(users.id, userId));
    }

    const updateData: Partial<typeof settings.$inferInsert> = {};
    if (parsed.directionDefault) updateData.directionDefault = parsed.directionDefault;
    if (parsed.slowThresholdMs) updateData.slowThresholdMs = parsed.slowThresholdMs;
    if (parsed.hardOnlyCount != null) updateData.hardOnlyCount = parsed.hardOnlyCount;

    if (Object.keys(updateData).length > 0) {
      await db
        .insert(settings)
        .values({ userId, ...updateData })
        .onConflictDoUpdate({ target: settings.userId, set: updateData });
    }

    const s = await db.query.settings.findFirst({ where: eq(settings.userId, userId) });
    return NextResponse.json(s);
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
