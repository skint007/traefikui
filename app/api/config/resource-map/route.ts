import { NextRequest, NextResponse } from "next/server";
import { buildResourceFileMap } from "@/lib/config/yaml-helpers";
import { proxyToAgent } from "@/lib/server-proxy";
import { requireSession } from "@/lib/require-session";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const serverId = request.nextUrl.searchParams.get("serverId");

    if (serverId) {
      const data = await proxyToAgent(serverId, "/config/resource-map");
      return NextResponse.json(data);
    }

    const map = await buildResourceFileMap();
    return NextResponse.json(map);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build resource map" },
      { status: 500 }
    );
  }
}
