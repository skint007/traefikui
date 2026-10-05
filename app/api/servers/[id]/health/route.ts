import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { server } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkAgentHealth } from "@/lib/server-proxy";
import { requestErrorMessage, requestErrorStatus } from "@/lib/request-deadline";
import { requireSession } from "@/lib/require-session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const srv = await db
      .select()
      .from(server)
      .where(eq(server.id, id))
      .get();

    if (!srv) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    const health = await checkAgentHealth(srv.url, srv.apiKey, request.signal);

    request.signal.throwIfAborted();
    await db
      .update(server)
      .set({
        status: health.ok ? "online" : "offline",
        lastSeen: health.ok ? new Date() : srv.lastSeen,
      })
      .where(eq(server.id, id));

    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      { error: requestErrorMessage(error, "Health check failed") },
      { status: requestErrorStatus(error, 500) }
    );
  }
}
