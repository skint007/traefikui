import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agent-middleware";
import { getEntrypoints } from "@/lib/traefik/client";

export async function GET(request: NextRequest) {
  const authError = requireAgentAuth(request);
  if (authError) return authError;

  try {
    const data = await getEntrypoints();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch entrypoints" },
      { status: 502 }
    );
  }
}
