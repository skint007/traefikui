import { NextRequest, NextResponse } from "next/server";
import { writeConfigFile } from "@/lib/config/yaml-helpers";
import { proxyToAgent } from "@/lib/server-proxy";
import { requireSession } from "@/lib/require-session";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { filePath, content, serverId } = body;

    if (!filePath || typeof content !== "string") {
      return NextResponse.json(
        { error: "Missing 'filePath' or 'content' in request body" },
        { status: 400 }
      );
    }

    if (serverId) {
      const data = await proxyToAgent(serverId, "/config/write", {
        method: "POST",
        body: { filePath, content },
      });
      return NextResponse.json(data);
    }

    await writeConfigFile(filePath, content);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("config/write failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Failed to write config file" },
      { status: 500 }
    );
  }
}
