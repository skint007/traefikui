import { NextRequest, NextResponse } from "next/server";
import { getMiddlewares } from "@/lib/traefik/client";
import { proxyToAgent } from "@/lib/server-proxy";
import { requireSession } from "@/lib/require-session";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const serverId = request.nextUrl.searchParams.get("serverId");

  try {
    if (serverId) {
      const data = await proxyToAgent(serverId, session.user.id, "/traefik/middlewares");
      return NextResponse.json(data);
    }

    const middlewares = await getMiddlewares();
    return NextResponse.json(middlewares);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch middlewares" },
      { status: 502 }
    );
  }
}
