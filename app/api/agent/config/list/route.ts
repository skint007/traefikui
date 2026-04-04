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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list config files" },
      { status: 500 }
    );
  }
}
