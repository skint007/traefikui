import { NextRequest, NextResponse } from "next/server";
import { requestErrorMessage, requestErrorStatus } from "@/lib/request-deadline";
import { renameConfigFile } from "@/lib/config/yaml-helpers";
import { proxyToAgent } from "@/lib/server-proxy";
import { requireSession } from "@/lib/require-session";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { oldPath, newPath, serverId } = body;

    if (!oldPath || !newPath) {
      return NextResponse.json(
        { error: "Missing 'oldPath' or 'newPath' in request body" },
        { status: 400 }
      );
    }

    if (serverId) {
      const data = await proxyToAgent(serverId, "/config/rename", {
        signal: request.signal,
        method: "POST",
        body: { oldPath, newPath },
      });
      return NextResponse.json(data);
    }

    await renameConfigFile(oldPath, newPath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("config/rename failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: requestErrorMessage(error, "Failed to rename config file") },
      { status: requestErrorStatus(error, 500) }
    );
  }
}
