import { NextRequest, NextResponse } from "next/server";
import { listConfigFiles } from "@/lib/config/yaml-helpers";
import { proxyToAgent } from "@/lib/server-proxy";
import { requireSession } from "@/lib/require-session";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const serverId = request.nextUrl.searchParams.get("serverId");

  try {
    if (serverId) {
      const data = await proxyToAgent(serverId, "/config/list");
      return NextResponse.json(data);
    }

    const files = await listConfigFiles();
    return NextResponse.json(files);
  } catch (error) {
    console.error("config/list failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Failed to list config files" },
      { status: 500 }
    );
  }
}
