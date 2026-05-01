import { NextRequest, NextResponse } from "next/server";
import { copyConfigFile } from "@/lib/config/yaml-helpers";
import { proxyToAgent } from "@/lib/server-proxy";
import { requireSession } from "@/lib/require-session";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { sourcePath, destPath, serverId } = body;

    if (!sourcePath || !destPath) {
      return NextResponse.json(
        { error: "Missing 'sourcePath' or 'destPath' in request body" },
        { status: 400 }
      );
    }

    if (serverId) {
      const data = await proxyToAgent(serverId, session.user.id, "/config/duplicate", {
        method: "POST",
        body: { sourcePath, destPath },
      });
      return NextResponse.json(data);
    }

    await copyConfigFile(sourcePath, destPath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("config/duplicate failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Failed to duplicate config file" },
      { status: 500 }
    );
  }
}
