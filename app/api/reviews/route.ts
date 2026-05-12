import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  pair: z.string().min(2).max(4),
  direction: z.enum(["lp_to_word", "word_to_lp"]),
  result: z.enum(["instant", "slow", "fail"]),
  durationMs: z.number().int().optional(),
  durationDiscarded: z.boolean().optional(),
  confusionType: z.enum(["none", "other_pair", "wrong_word"]).optional(),
  confusedWithPair: z.string().max(4).optional(),
  confusedWithText: z.string().optional(),
  sessionId: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();
    const parsed = schema.parse(body);

    const [review] = await db
      .insert(reviews)
      .values({
        userId,
        pair: parsed.pair.toUpperCase(),
        direction: parsed.direction,
        result: parsed.result,
        durationMs: parsed.durationMs,
        durationDiscarded: parsed.durationDiscarded ?? false,
        confusionType: parsed.confusionType ?? null,
        confusedWithPair: parsed.confusedWithPair?.toUpperCase() ?? null,
        confusedWithText: parsed.confusedWithText ?? null,
      })
      .returning();

    return NextResponse.json(review, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
