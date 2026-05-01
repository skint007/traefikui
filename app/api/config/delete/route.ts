import { NextRequest, NextResponse } from "next/server";
import { deleteConfigFile } from "@/lib/config/yaml-helpers";
import { proxyToAgent } from "@/lib/server-proxy";
import { requireSession } from "@/lib/require-session";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { filePath, serverId } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: "Missing 'filePath' in request body" },
        { status: 400 }
      );
    }

    if (serverId) {
      const data = await proxyToAgent(serverId, session.user.id, "/config/delete", {
        method: "POST",
        body: { filePath },
      });
      return NextResponse.json(data);
    }

    await deleteConfigFile(filePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("config/delete failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Failed to delete config file" },
      { status: 500 }
    );
  }
}
