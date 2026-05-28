import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { username, currentPassword, newPassword } = await req.json();

  if (!username || !newPassword) {
    return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Passwort muss mindestens 6 Zeichen haben" }, { status: 400 });
  }

  const user = await db.query.users.findFirst({ where: eq(users.username, username) });

  if (!user) {
    return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
  }

  if (currentPassword) {
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Aktuelles Passwort falsch" }, { status: 401 });
    }
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await db.update(users).set({ passwordHash: hash }).where(eq(users.username, username));

  return NextResponse.json({ ok: true });
}
