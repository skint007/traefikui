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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build resource map" },
      { status: 500 }
    );
  }
}
