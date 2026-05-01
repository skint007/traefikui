import { NextRequest, NextResponse } from "next/server";
import { getEntrypoints } from "@/lib/traefik/client";
import { proxyToAgent } from "@/lib/server-proxy";
import { requireSession } from "@/lib/require-session";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const serverId = request.nextUrl.searchParams.get("serverId");

  try {
    if (serverId) {
      const data = await proxyToAgent(serverId, session.user.id, "/traefik/entrypoints");
      return NextResponse.json(data);
    }

    const entrypoints = await getEntrypoints();
    return NextResponse.json(entrypoints);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch entrypoints" },
      { status: 502 }
    );
  }
}
