import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/require-session";

const RoleUpdateSchema = z.object({
  role: z.enum(["admin", "user"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = RoleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "role must be 'admin' or 'user'" },
        { status: 400 }
      );
    }
    const { role } = parsed.data;

    const target = await db
      .select({ id: user.id, role: user.role })
      .from(user)
      .where(eq(user.id, id))
      .get();

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.role === role) {
      return NextResponse.json({ id: target.id, role });
    }

    // Prevent removing the last admin so the system always has someone who
    // can manage the shared server list and other admin-gated settings.
    if (target.role === "admin" && role === "user") {
      const admins = await db
        .select({ total: count() })
        .from(user)
        .where(eq(user.role, "admin"))
        .get();
      if ((admins?.total ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last admin" },
          { status: 400 }
        );
      }
    }

    await db.update(user).set({ role }).where(eq(user.id, id));

    return NextResponse.json({ id: target.id, role });
  } catch (error) {
    console.error("Failed to update user role:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}
