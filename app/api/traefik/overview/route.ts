import { NextRequest, NextResponse } from "next/server";
import { getOverview } from "@/lib/traefik/client";
import { proxyToAgent } from "@/lib/server-proxy";
import { requireSession } from "@/lib/require-session";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const serverId = request.nextUrl.searchParams.get("serverId");

  try {
    if (serverId) {
      const data = await proxyToAgent(serverId, session.user.id, "/traefik/overview");
      return NextResponse.json(data);
    }

    const overview = await getOverview();
    return NextResponse.json(overview);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch overview" },
      { status: 502 }
    );
  }
}
