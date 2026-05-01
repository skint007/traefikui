import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agent-middleware";
import { deleteConfigFile } from "@/lib/config/yaml-helpers";

export async function POST(request: NextRequest) {
  const authError = requireAgentAuth(request);
  if (authError) return authError;

  try {
    const { filePath } = await request.json();
    if (!filePath) {
      return NextResponse.json(
        { error: "Missing 'filePath' in request body" },
        { status: 400 }
      );
    }

    await deleteConfigFile(filePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("agent route failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Failed to delete config file" },
      { status: 500 }
    );
  }
}
