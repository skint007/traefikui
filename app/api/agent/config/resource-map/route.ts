import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agent-middleware";
import { buildResourceFileMap } from "@/lib/config/yaml-helpers";

export async function GET(request: NextRequest) {
  const authError = requireAgentAuth(request);
  if (authError) return authError;

  try {
    const map = await buildResourceFileMap();
    return NextResponse.json(map);
  } catch (error) {
    console.error("agent route failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Failed to build resource map" },
      { status: 500 }
    );
  }
}
