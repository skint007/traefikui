import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { server } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { requireSession, requireAdmin } from "@/lib/require-session";
import { validateServerUrl } from "@/lib/validate-url";

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "••••••••";
  return apiKey.slice(0, 4) + "••••" + apiKey.slice(-4);
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
      .where(eq(server.id, id))
      .get();

    if (!result) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    const { apiKey, ...safe } = result;
    return NextResponse.json({ ...safe, apiKeyMasked: maskApiKey(apiKey) });
  } catch (error) {
    console.error("Failed to get server:", error instanceof Error ? error.message : "unknown error");
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
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, url, apiKey, isDefault } = body;

    const existing = await db
      .select()
      .from(server)
      .where(eq(server.id, id))
      .get();
    if (!existing) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    if (isDefault) {
      await db
        .update(server)
        .set({ isDefault: false })
        .where(and(eq(server.isDefault, true), ne(server.id, id)));
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

    await db.update(server).set(updates).where(eq(server.id, id));

    const updated = await db
      .select()
      .from(server)
      .where(eq(server.id, id))
      .get();
    if (!updated) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { apiKey: _omit, ...safe } = updated;
    return NextResponse.json({ ...safe, apiKeyMasked: maskApiKey(updated.apiKey) });
  } catch (error) {
    console.error("Failed to update server:", error instanceof Error ? error.message : "unknown error");
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
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const existing = await db
      .select()
      .from(server)
      .where(eq(server.id, id))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    await db.delete(server).where(eq(server.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete server:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "Failed to delete server" },
      { status: 500 }
    );
  }
}
