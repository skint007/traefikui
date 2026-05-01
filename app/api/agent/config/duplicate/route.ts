import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agent-middleware";
import { copyConfigFile } from "@/lib/config/yaml-helpers";

export async function POST(request: NextRequest) {
  const authError = requireAgentAuth(request);
  if (authError) return authError;

  try {
    const { sourcePath, destPath } = await request.json();
    if (!sourcePath || !destPath) {
      return NextResponse.json(
        { error: "Missing 'sourcePath' or 'destPath' in request body" },
        { status: 400 }
      );
    }

    await copyConfigFile(sourcePath, destPath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("agent route failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Failed to duplicate config file" },
      { status: 500 }
    );
  }
}
