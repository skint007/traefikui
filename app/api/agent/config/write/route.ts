import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agent-middleware";
import { writeConfigFile } from "@/lib/config/yaml-helpers";

export async function POST(request: NextRequest) {
  const authError = requireAgentAuth(request);
  if (authError) return authError;

  try {
    const { filePath, content } = await request.json();
    if (!filePath || typeof content !== "string") {
      return NextResponse.json(
        { error: "Missing 'filePath' or 'content' in request body" },
        { status: 400 }
      );
    }

    await writeConfigFile(filePath, content);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("agent route failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Failed to write config file" },
      { status: 500 }
    );
  }
}
