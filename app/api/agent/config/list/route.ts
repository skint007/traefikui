import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agent-middleware";
import { listConfigFiles } from "@/lib/config/yaml-helpers";

export async function GET(request: NextRequest) {
  const authError = requireAgentAuth(request);
  if (authError) return authError;

  try {
    const files = await listConfigFiles();
    return NextResponse.json(files);
  } catch (error) {
    console.error("agent route failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Failed to list config files" },
      { status: 500 }
    );
  }
}
