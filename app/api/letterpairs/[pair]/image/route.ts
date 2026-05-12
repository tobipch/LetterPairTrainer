import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { letterpairs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  try {
    await requireAuth();
    const { pair } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const blob = await put(`pairs/${pair.toUpperCase()}_${Date.now()}`, file, {
      access: "public",
    });

    await db
      .update(letterpairs)
      .set({ imageUrl: blob.url, updatedAt: new Date() })
      .where(eq(letterpairs.pair, pair.toUpperCase()));

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
