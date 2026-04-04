import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { server } from "@/lib/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { requireSession } from "@/lib/require-session";
import { validateServerUrl } from "@/lib/validate-url";

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "••••••••";
  return apiKey.slice(0, 4) + "••••" + apiKey.slice(-4);
}

function ownerFilter(id: string, userId: string) {
  return and(eq(server.id, id), or(eq(server.userId, userId), isNull(server.userId)));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const result = await db
      .select()
      .from(server)
      .where(ownerFilter(id, session.user.id))
      .get();

    if (!result) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    const { apiKey, ...safe } = result;
    return NextResponse.json({ ...safe, apiKeyMasked: maskApiKey(apiKey) });
  } catch {
    return NextResponse.json(
      { error: "Failed to get server" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const userId = session.user.id;
    const body = await request.json();
    const { name, url, apiKey, isDefault } = body;

    const existing = await db
      .select()
      .from(server)
      .where(ownerFilter(id, userId))
      .get();
    if (!existing) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    // If setting as default, clear other defaults for this user
    if (isDefault) {
      await db
        .update(server)
        .set({ isDefault: false })
        .where(
          and(eq(server.isDefault, true), or(eq(server.userId, userId), isNull(server.userId)))
        );
    }

    if (url !== undefined) {
      const urlCheck = validateServerUrl(url);
      if (!urlCheck.valid) {
        return NextResponse.json(
          { error: urlCheck.error },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url.replace(/\/+$/, "");
    if (apiKey !== undefined) updates.apiKey = apiKey;
    if (isDefault !== undefined) updates.isDefault = isDefault;
    // Assign ownership if not already set
    if (!existing.userId) updates.userId = userId;

    await db.update(server).set(updates).where(eq(server.id, id));

    const updated = await db.select().from(server).where(eq(server.id, id)).get();
    if (!updated) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { apiKey: _omit, ...safe } = updated;
    return NextResponse.json({ ...safe, apiKeyMasked: maskApiKey(updated.apiKey) });
  } catch {
    return NextResponse.json(
      { error: "Failed to update server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const existing = await db
      .select()
      .from(server)
      .where(ownerFilter(id, session.user.id))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    await db.delete(server).where(eq(server.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete server" },
      { status: 500 }
    );
  }
}
