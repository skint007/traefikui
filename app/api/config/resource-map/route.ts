import { NextRequest, NextResponse } from "next/server";
import { requestErrorMessage, requestErrorStatus } from "@/lib/request-deadline";
import { buildResourceFileMap } from "@/lib/config/yaml-helpers";
import { proxyToAgent } from "@/lib/server-proxy";
import { requireSession } from "@/lib/require-session";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const serverId = request.nextUrl.searchParams.get("serverId");

    if (serverId) {
      const data = await proxyToAgent(serverId, "/config/resource-map", { signal: request.signal });
      return NextResponse.json(data);
    }

    const map = await buildResourceFileMap();
    return NextResponse.json(map);
  } catch (error) {
    console.error("config/resource-map failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: requestErrorMessage(error, "Failed to build resource map") },
      { status: requestErrorStatus(error, 500) }
    );
  }
}
