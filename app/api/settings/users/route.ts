import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { requireSession } from "@/lib/require-session";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        twoFactorEnabled: user.twoFactorEnabled,
      })
      .from(user)
      .orderBy(asc(user.createdAt))
      .all();

    return NextResponse.json(users);
  } catch {
    return NextResponse.json(
      { error: "Failed to list users" },
      { status: 500 }
    );
  }
}
