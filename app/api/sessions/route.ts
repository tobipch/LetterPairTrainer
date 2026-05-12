import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainSessions } from "@/db/schema";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  mode: z.enum(["daily_all", "hard_only", "custom"]),
  directionSetting: z.enum(["lp_to_word", "word_to_lp", "random"]),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();
    const parsed = schema.parse(body);

    const [session] = await db
      .insert(trainSessions)
      .values({ userId, mode: parsed.mode, directionSetting: parsed.directionSetting })
      .returning();

    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
