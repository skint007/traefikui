import { NextRequest, NextResponse } from "next/server";
import { requestErrorMessage, requestErrorStatus } from "@/lib/request-deadline";
import { readConfigFile } from "@/lib/config/yaml-helpers";
import { proxyToAgent } from "@/lib/server-proxy";
import { requireSession } from "@/lib/require-session";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const filePath = request.nextUrl.searchParams.get("path");
  const serverId = request.nextUrl.searchParams.get("serverId");

  if (!filePath) {
    return NextResponse.json(
      { error: "Missing 'path' query parameter" },
      { status: 400 }
    );
  }

  try {
    if (serverId) {
      const data = await proxyToAgent(serverId, `/config/read?path=${encodeURIComponent(filePath)}`, { signal: request.signal });
      return NextResponse.json(data);
    }

    const result = await readConfigFile(filePath);
    return NextResponse.json(result);
  } catch (error) {
    console.error("config/read failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: requestErrorMessage(error, "Failed to read config file") },
      { status: requestErrorStatus(error, 500) }
    );
  }
}
